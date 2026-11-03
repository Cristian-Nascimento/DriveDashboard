"use client";

import { useState } from "react";
import { updateSale } from "@/app/actions/data";
import { brl, centsToInput, parseMoney } from "@/lib/format";

// Usado só para editar uma venda já lançada (o lançamento novo é feito em DayForm).

type Product = { id: string; name: string; price: number; stock: number };
type Row = { key: number; productId: string; name: string; qty: string; price: string };
export type EditableSale = {
  id: string;
  items: { productId: string | null; name: string; qty: number; unitPrice: number }[];
};

let seq = 1;
const emptyRow = (): Row => ({ key: seq++, productId: "", name: "", qty: "1", price: "" });

export function SaleForm({ date, products, sale }: { date: string; products: Product[]; sale: EditableSale }) {
  const [rows, setRows] = useState<Row[]>(() =>
    sale.items.length
      ? sale.items.map((i) => ({
          key: seq++,
          productId: i.productId ?? "",
          name: i.name,
          qty: String(i.qty),
          price: centsToInput(i.unitPrice),
        }))
      : [emptyRow()],
  );

  const update = (key: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const pick = (key: number, productId: string) => {
    const p = products.find((x) => x.id === productId);
    update(key, { productId, name: p?.name ?? "", price: p ? centsToInput(p.price) : "" });
  };

  const items = rows
    .map((r) => ({
      productId: r.productId || null,
      name: r.name || "Item avulso",
      qty: Math.max(1, Math.round(Number(r.qty) || 1)),
      unitPrice: parseMoney(r.price),
    }))
    .filter((i) => i.unitPrice > 0);
  const total = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);

  return (
    <form action={updateSale} className="space-y-3">
      <input type="hidden" name="id" value={sale.id} />
      <div className="max-w-xs">
        <label className="label">Data</label>
        <input type="date" name="date" className="input" defaultValue={date} required />
      </div>
      <input type="hidden" name="items" value={JSON.stringify(items)} />

      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.key} className="grid grid-cols-[minmax(0,1fr)_3.5rem_5.5rem_2rem] items-end gap-2 sm:grid-cols-[minmax(0,1fr)_4rem_6rem_2rem]">
            <div className="min-w-0">
              <label className="label">Produto</label>
              <select className="input" value={r.productId} onChange={(e) => pick(r.key, e.target.value)}>
                <option value="">Item avulso…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.stock})</option>
                ))}
              </select>
              {!r.productId && (
                <input className="input mt-1" placeholder="Nome do item" value={r.name} onChange={(e) => update(r.key, { name: e.target.value })} />
              )}
            </div>
            <div className="min-w-0">
              <label className="label">Qtd</label>
              <input className="input" inputMode="numeric" value={r.qty} onChange={(e) => update(r.key, { qty: e.target.value })} />
            </div>
            <div className="min-w-0">
              <label className="label">Preço un.</label>
              <input className="input" inputMode="decimal" placeholder="0,00" value={r.price} onChange={(e) => update(r.key, { price: e.target.value })} />
            </div>
            <button
              type="button"
              aria-label="Remover item"
              className="btn-danger mb-1 text-base"
              onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((x) => x.key !== r.key) : rs))}
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button type="button" className="btn-ghost" onClick={() => setRows((rs) => [...rs, emptyRow()])}>
        + Adicionar item
      </button>

      <div className="flex items-center justify-between rounded-xl bg-brand-soft px-4 py-3">
        <span className="text-sm text-muted">Total da venda</span>
        <span className="text-lg font-semibold">{brl(total)}</span>
      </div>

      <button className="btn w-full sm:w-auto" disabled={total <= 0}>Salvar alterações</button>
    </form>
  );
}
