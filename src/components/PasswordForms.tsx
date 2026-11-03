"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  changePassword,
  requestReset,
  resetPassword,
  type AuthState,
  type ResetState,
} from "@/app/actions/auth";

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-lg font-semibold text-white">P</div>
          <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        </div>
        {children}
        <p className="mt-4 text-center text-sm">
          <Link href="/login" className="font-medium text-brand underline">Voltar para o login</Link>
        </p>
      </div>
    </div>
  );
}

export function ForgotForm() {
  const [state, action, pending] = useActionState<ResetState, FormData>(requestReset, undefined);
  return (
    <Shell title="Esqueci minha senha" subtitle="Enviaremos um link para criar uma nova senha">
      {state?.sent ? (
        <div className="card space-y-3 text-sm">
          <p>Se existir uma conta com esse e-mail, enviamos o link de redefinição. Ele vale por 1 hora.</p>
          {state.devLink && (
            <p className="rounded-lg bg-warn/10 px-3 py-2 text-xs">
              Modo desenvolvimento (SMTP não configurado):{" "}
              <a className="break-all font-medium underline" href={state.devLink}>abrir link de redefinição</a>
            </p>
          )}
        </div>
      ) : (
        <form action={action} className="card space-y-4">
          <div>
            <label className="label" htmlFor="email">E-mail da conta</label>
            <input id="email" name="email" type="email" className="input" autoComplete="email" required />
          </div>
          {state?.error && <p role="alert" className="rounded-lg bg-neg/10 px-3 py-2 text-sm text-neg">{state.error}</p>}
          <button className="btn w-full" disabled={pending}>{pending ? "Enviando…" : "Enviar link"}</button>
        </form>
      )}
    </Shell>
  );
}

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(resetPassword, undefined);
  return (
    <Shell title="Nova senha" subtitle="Escolha uma senha com pelo menos 8 caracteres">
      <form action={action} className="card space-y-4">
        <input type="hidden" name="token" value={token} />
        <div>
          <label className="label" htmlFor="password">Nova senha</label>
          <input id="password" name="password" type="password" className="input" autoComplete="new-password" minLength={8} required />
        </div>
        <div>
          <label className="label" htmlFor="confirm">Confirmar nova senha</label>
          <input id="confirm" name="confirm" type="password" className="input" autoComplete="new-password" required />
        </div>
        {state?.error && <p role="alert" className="rounded-lg bg-neg/10 px-3 py-2 text-sm text-neg">{state.error}</p>}
        <button className="btn w-full" disabled={pending}>{pending ? "Salvando…" : "Salvar nova senha"}</button>
      </form>
    </Shell>
  );
}

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState<ResetState, FormData>(changePassword, undefined);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3">
      <div>
        <label className="label">Senha atual</label>
        <input name="current" type="password" className="input" autoComplete="current-password" required />
      </div>
      <div>
        <label className="label">Nova senha</label>
        <input name="password" type="password" className="input" autoComplete="new-password" minLength={8} required />
      </div>
      <div>
        <label className="label">Confirmar nova senha</label>
        <input name="confirm" type="password" className="input" autoComplete="new-password" required />
      </div>
      <div className="sm:col-span-3">
        {state?.error && <p role="alert" className="mb-3 rounded-lg bg-neg/10 px-3 py-2 text-sm text-neg">{state.error}</p>}
        {state?.sent && <p className="mb-3 rounded-lg bg-pos/10 px-3 py-2 text-sm text-pos">Senha alterada.</p>}
        <button className="btn w-full sm:w-auto" disabled={pending}>{pending ? "Salvando…" : "Alterar senha"}</button>
      </div>
    </form>
  );
}
