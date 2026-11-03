"use server";

import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendMail } from "@/lib/mail";
import { createSession, destroySession, requireUser } from "@/lib/session";

export type AuthState = { error?: string } | undefined;

// Limitador simples em memória (suficiente para uso pessoal / uma instância)
const attempts = new Map<string, { n: number; until: number }>();
const MAX_ATTEMPTS = 6;
const WINDOW_MS = 10 * 60 * 1000;

function tooMany(key: string): boolean {
  const a = attempts.get(key);
  if (!a) return false;
  if (Date.now() > a.until) {
    attempts.delete(key);
    return false;
  }
  return a.n >= MAX_ATTEMPTS;
}

function fail(key: string) {
  const a = attempts.get(key);
  if (!a || Date.now() > a.until) attempts.set(key, { n: 1, until: Date.now() + WINDOW_MS });
  else a.n += 1;
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido."),
  password: z.string().min(1, "Informe a senha."),
});

export async function login(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { email, password } = parsed.data;

  if (tooMany(email)) return { error: "Muitas tentativas. Aguarde alguns minutos e tente de novo." };

  const user = await db.user.findUnique({ where: { email } });
  // compara sempre, para não revelar se o e-mail existe pelo tempo de resposta
  const hash = user?.passwordHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalid.";
  const ok = await bcrypt.compare(password, hash);
  if (!user || !ok) {
    fail(email);
    return { error: "E-mail ou senha incorretos." };
  }

  attempts.delete(email);
  await createSession(user.id);
  redirect("/");
}

const registerSchema = z
  .object({
    name: z.string().trim().min(2, "Informe seu nome."),
    email: z.string().trim().toLowerCase().email("Informe um e-mail válido."),
    password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "As senhas não conferem.", path: ["confirm"] });

export async function register(_: AuthState, form: FormData): Promise<AuthState> {
  if (process.env.ALLOW_REGISTER === "false") return { error: "Cadastro desativado." };

  const parsed = registerSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password } = parsed.data;

  const exists = await db.user.findUnique({ where: { email } });
  if (exists) return { error: "Já existe uma conta com esse e-mail." };

  const user = await db.user.create({
    data: {
      name,
      email,
      passwordHash: await bcrypt.hash(password, 11),
      machines: { create: { name: "Moderninha Smart 2", debitFee: 0, creditFee: 0, creditInstFee: 0, pixFee: 0 } },
    },
  });

  await createSession(user.id);
  redirect("/maquininhas?novo=1");
}

/* ---------- Recuperação e troca de senha ---------- */

export type ResetState = { error?: string; sent?: boolean; devLink?: string } | undefined;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

async function appUrl(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function requestReset(_: ResetState, form: FormData): Promise<ResetState> {
  const parsed = z.string().trim().toLowerCase().email().safeParse(form.get("email"));
  if (!parsed.success) return { error: "Informe um e-mail válido." };
  const email = parsed.data;

  const rl = `reset:${email}`;
  if (tooMany(rl)) return { error: "Muitas solicitações. Aguarde alguns minutos." };
  fail(rl);

  const user = await db.user.findUnique({ where: { email } });
  let devLink: string | undefined;
  if (user) {
    const token = randomBytes(32).toString("hex");
    await db.passwordReset.deleteMany({ where: { userId: user.id } });
    await db.passwordReset.create({
      data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    const link = `${await appUrl()}/redefinir-senha?token=${token}`;
    try {
      const sent = await sendMail(
        email,
        "Redefinir sua senha · Pop Dashboard",
        `Olá, ${user.name}!\n\nPara criar uma nova senha, acesse o link abaixo (vale por 1 hora):\n${link}\n\nSe você não pediu isso, ignore este e-mail.`,
      );
      if (!sent && process.env.NODE_ENV !== "production") devLink = link;
    } catch (e) {
      console.error("Falha ao enviar e-mail de redefinição:", e);
    }
  }
  // mesma resposta exista ou não a conta, para não revelar quem tem cadastro
  return { sent: true, devLink };
}

const resetSchema = z
  .object({
    token: z.string().min(20),
    password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "As senhas não conferem.", path: ["confirm"] });

export async function resetPassword(_: AuthState, form: FormData): Promise<AuthState> {
  const parsed = resetSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { token, password } = parsed.data;

  const reset = await db.passwordReset.findUnique({ where: { tokenHash: sha256(token) } });
  if (!reset || reset.usedAt || reset.expiresAt < new Date()) {
    return { error: "Link inválido ou expirado. Peça um novo em “Esqueci minha senha”." };
  }

  await db.$transaction([
    db.user.update({ where: { id: reset.userId }, data: { passwordHash: await bcrypt.hash(password, 11) } }),
    db.passwordReset.deleteMany({ where: { userId: reset.userId } }),
  ]);
  await createSession(reset.userId);
  redirect("/");
}

const changeSchema = z
  .object({
    current: z.string().min(1, "Informe a senha atual."),
    password: z.string().min(8, "A nova senha precisa ter pelo menos 8 caracteres."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "As senhas não conferem.", path: ["confirm"] });

export async function changePassword(_: ResetState, form: FormData): Promise<ResetState> {
  const me = await requireUser();
  const parsed = changeSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const rl = `change:${me.id}`;
  if (tooMany(rl)) return { error: "Muitas tentativas. Aguarde alguns minutos." };

  const user = await db.user.findUnique({ where: { id: me.id } });
  if (!user || !(await bcrypt.compare(parsed.data.current, user.passwordHash))) {
    fail(rl);
    return { error: "Senha atual incorreta." };
  }
  await db.user.update({ where: { id: me.id }, data: { passwordHash: await bcrypt.hash(parsed.data.password, 11) } });
  return { sent: true };
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
