"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, register, type AuthState } from "@/app/actions/auth";

export function AuthForm({ mode, canRegister }: { mode: "login" | "register"; canRegister: boolean }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(mode === "login" ? login : register, undefined);

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-lg font-semibold text-white">
            P
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Pop Dashboard</h1>
          <p className="mt-1 text-sm text-muted">Controle financeiro para motoristas de aplicativo</p>
        </div>

        <form action={action} className="card space-y-4">
          {mode === "register" && (
            <div>
              <label className="label" htmlFor="name">Nome</label>
              <input id="name" name="name" className="input" autoComplete="name" required />
            </div>
          )}
          <div>
            <label className="label" htmlFor="email">E-mail</label>
            <input id="email" name="email" type="email" className="input" autoComplete="email" required />
          </div>
          <div>
            <label className="label" htmlFor="password">Senha</label>
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              minLength={mode === "register" ? 8 : undefined}
              required
            />
          </div>
          {mode === "register" && (
            <div>
              <label className="label" htmlFor="confirm">Confirmar senha</label>
              <input id="confirm" name="confirm" type="password" className="input" autoComplete="new-password" required />
            </div>
          )}

          {state?.error && (
            <p role="alert" className="rounded-lg bg-neg/10 px-3 py-2 text-sm text-neg">{state.error}</p>
          )}

          <button className="btn w-full" disabled={pending}>
            {pending ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}
          </button>
          {mode === "login" && (
            <p className="text-center text-sm">
              <Link href="/esqueci-senha" className="text-muted underline">Esqueci minha senha</Link>
            </p>
          )}
        </form>

        {canRegister && (
          <p className="mt-4 text-center text-sm text-muted">
            {mode === "login" ? (
              <>Ainda não tem conta? <Link href="/cadastro" className="font-medium text-brand underline">Cadastre-se</Link></>
            ) : (
              <>Já tem conta? <Link href="/login" className="font-medium text-brand underline">Entrar</Link></>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
