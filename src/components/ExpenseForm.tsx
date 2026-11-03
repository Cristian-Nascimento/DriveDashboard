"use client";

import { useState } from "react";
import { addExpense } from "@/app/actions/data";
import { CAR_CATEGORIES, STORE_CATEGORIES } from "@/lib/constants";

export function ExpenseForm({ date }: { date: string }) {
  const [scope, setScope] = useState<"CAR" | "STORE">("CAR");
  const cats = scope === "CAR" ? CAR_CATEGORIES : STORE_CATEGORIES;

  return (
    <form action={addExpense} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="date" value={date} />
      <div>
        <label className="label">Tipo</label>
        <select name="scope" className="input" value={scope} onChange={(e) => setScope(e.target.value as "CAR" | "STORE")}>
          <option value="CAR">Carro / corridas</option>
          <option value="STORE">Vendinha</option>
        </select>
      </div>
      <div>
        <label className="label">Categoria</label>
        <select key={scope} name="category" className="input">
          {cats.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Valor (R$)</label>
        <input name="amount" className="input" inputMode="decimal" placeholder="0,00" required />
      </div>
      <div>
        <label className="label">Descrição (opcional)</label>
        <input name="description" className="input" maxLength={200} placeholder="Ex.: Posto Shell, 20 L" />
      </div>
      <div className="sm:col-span-2">
        <button className="btn w-full sm:w-auto">Adicionar despesa</button>
      </div>
    </form>
  );
}
