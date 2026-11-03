"use client";

import { useState } from "react";
import { createBill } from "@/app/actions/bills";
import { BILL_TYPES } from "@/lib/constants";

export function BillForm({ today }: { today: string }) {
  const [mode, setMode] = useState<"PARCELADA" | "FIXA">("PARCELADA");
  const [current, setCurrent] = useState("1");
  const [remaining, setRemaining] = useState("11");

  const cur = Math.max(1, Math.round(Number(current) || 1));
  const rem = Math.max(0, Math.round(Number(remaining) || 0));

  return (
    <form action={createBill} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div className="sm:col-span-2 lg:col-span-3">
        <div className="inline-flex rounded-xl border border-line bg-white p-1">
          {(["PARCELADA", "FIXA"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${mode === m ? "bg-brand text-white" : "text-muted"}`}
            >
              {m === "PARCELADA" ? "Parcelada (tem fim)" : "Fixa todo mês (sem fim)"}
            </button>
          ))}
        </div>
        <input type="hidden" name="mode" value={mode} />
      </div>

      <div className="lg:col-span-2">
        <label className="label">Nome da conta</label>
        <input name="name" className="input" required maxLength={80} placeholder="Ex.: Financiamento do Onix" />
      </div>
      <div>
        <label className="label">Tipo de despesa</label>
        <select name="category" className="input">
          {BILL_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Valor da parcela (R$)</label>
        <input name="amount" className="input" inputMode="decimal" placeholder="0,00" required />
      </div>
      <div>
        <label className="label">{mode === "PARCELADA" ? "Vencimento da parcela atual" : "Próximo vencimento"}</label>
        <input name="dueDate" type="date" className="input" defaultValue={today} required />
      </div>
      <div>
        <label className="label">Pertence a</label>
        <select name="scope" className="input">
          <option value="CAR">Carro / corridas</option>
          <option value="STORE">Vendinha</option>
        </select>
      </div>

      {mode === "PARCELADA" && (
        <>
          <div>
            <label className="label">Parcela atual (nº)</label>
            <input name="current" className="input" inputMode="numeric" value={current} onChange={(e) => setCurrent(e.target.value)} />
          </div>
          <div>
            <label className="label">Quantas faltam depois dela</label>
            <input name="remaining" className="input" inputMode="numeric" value={remaining} onChange={(e) => setRemaining(e.target.value)} />
          </div>
          <p className="self-end rounded-xl bg-brand-soft px-3 py-2.5 text-sm">
            Serão cadastradas as parcelas <strong>{cur}</strong> a <strong>{cur + rem}</strong> ({rem + 1} no total).
          </p>
        </>
      )}
      {mode === "FIXA" && (
        <p className="rounded-xl bg-brand-soft px-3 py-2.5 text-sm sm:col-span-2 lg:col-span-3">
          Os próximos 12 meses ficam cadastrados e o sistema renova sozinho. Ideal para aluguel, internet, plano e seguro mensal.
        </p>
      )}

      <div className="sm:col-span-2 lg:col-span-3">
        <button className="btn w-full sm:w-auto">Cadastrar conta e parcelas</button>
      </div>
    </form>
  );
}
