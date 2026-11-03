"use client";

import { useState } from "react";
import { saveDay } from "@/app/actions/data";
import { CAR_CATEGORIES, PLATFORMS, STORE_CATEGORIES } from "@/lib/constants";
import { brl, centsToInput, parseDecimal, parseMoney } from "@/lib/format";
import { Section } from "./ui";

type Product = { id: string; name: string; price: number; stock: number };

type EarningRow = { key: number; platform: string; gross: string; trips: string };
type ItemRow = { key: number; productId: string; name: string; qty: string; price: string };
type ExpenseRow = { key: number; scope: "CAR" | "STORE"; category: string; amount: string; description: string };

let seq = 1;
const PLATFORM_KEYS = Object.keys(PLATFORMS);
const sub = "min-w-0"; // evita que selects/inputs estiquem a grade e criem rolagem lateral

function RemoveBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="btn-danger !px-2.5 !py-1.5 text-base">
      ✕
    </button>
  );
}

export function DayForm({
  date,
  products,
  workDay,
}: {
  date: string;
  products: Product[];
  workDay: { km: string; hours: string; note: string };
}) {
  const newEarning = (): EarningRow => ({ key: seq++, platform: PLATFORM_KEYS[0], gross: "", trips: "" });
  const newItem = (): ItemRow => ({ key: seq++, productId: "", name: "", qty: "1", price: "" });
  const newExpense = (): ExpenseRow => ({ key: seq++, scope: "CAR", category: CAR_CATEGORIES[0], amount: "", description: "" });

  const [work, setWork] = useState(workDay);
  const [earnings, setEarnings] = useState<EarningRow[]>(() => [newEarning()]);
  const [items, setItems] = useState<ItemRow[]>(() => [newItem()]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>(() => [newExpense()]);

  const patchEarning = (key: number, p: Partial<EarningRow>) => setEarnings((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const patchItem = (key: number, p: Partial<ItemRow>) => setItems((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const patchExpense = (key: number, p: Partial<ExpenseRow>) => setExpenses((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));

  const pickProduct = (key: number, productId: string) => {
    const p = products.find((x) => x.id === productId);
    patchItem(key, { productId, name: p?.name ?? "", price: p ? centsToInput(p.price) : "" });
  };

  const saleItems = items
    .map((i) => ({
      productId: i.productId || null,
      name: i.name.trim() || "Item avulso",
      qty: Math.max(1, Math.round(Number(i.qty) || 1)),
      unitPrice: parseMoney(i.price),
    }))
    .filter((i) => i.unitPrice > 0);
  const saleTotal = saleItems.reduce((a, i) => a + i.qty * i.unitPrice, 0);

  // só viaja o que foi preenchido; linhas em branco são ignoradas
  const payload = JSON.stringify({
    workDay: work,
    earnings: earnings
      .filter((e) => parseMoney(e.gross) > 0)
      .map((e) => ({ platform: e.platform, gross: parseMoney(e.gross), trips: Math.max(0, Math.round(parseDecimal(e.trips))) })),
    sale: { items: saleItems },
    expenses: expenses
      .filter((x) => parseMoney(x.amount) > 0)
      .map((x) => ({ scope: x.scope, category: x.category, amount: parseMoney(x.amount), description: x.description.trim() })),
  });

  const filled =
    earnings.some((e) => parseMoney(e.gross) > 0) ||
    saleTotal > 0 ||
    expenses.some((x) => parseMoney(x.amount) > 0) ||
    work.km.trim() !== "" ||
    work.hours.trim() !== "" ||
    work.note.trim() !== "";

  return (
    <form action={saveDay} noValidate>
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="payload" value={payload} />

      <Section id="fechamento" title="1. Fechamento do dia">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className={sub}>
            <label className="label">Km rodados</label>
            <input className="input" inputMode="decimal" placeholder="0" value={work.km} onChange={(e) => setWork({ ...work, km: e.target.value })} />
          </div>
          <div className={sub}>
            <label className="label">Horas online</label>
            <input className="input" inputMode="decimal" placeholder="0" value={work.hours} onChange={(e) => setWork({ ...work, hours: e.target.value })} />
          </div>
          <div className={sub}>
            <label className="label">Observação</label>
            <input className="input" maxLength={300} value={work.note} onChange={(e) => setWork({ ...work, note: e.target.value })} />
          </div>
        </div>
      </Section>

      <Section id="ganhos" title="2. O que entrou (corridas)">
        <div className="space-y-3">
          {earnings.map((e) => (
            <div key={e.key} className="rounded-xl border border-line p-3">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className={sub}>
                  <label className="label">Plataforma</label>
                  <select className="input" value={e.platform} onChange={(ev) => patchEarning(e.key, { platform: ev.target.value })}>
                    {Object.entries(PLATFORMS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div className={sub}>
                  <label className="label">Valor (R$)</label>
                  <input className="input" inputMode="decimal" placeholder="0,00" value={e.gross} onChange={(ev) => patchEarning(e.key, { gross: ev.target.value })} />
                </div>
                <div className={sub}>
                  <label className="label">Nº de corridas</label>
                  <input className="input" inputMode="numeric" placeholder="0" value={e.trips} onChange={(ev) => patchEarning(e.key, { trips: ev.target.value })} />
                </div>
              </div>
              {earnings.length > 1 && (
                <div className="mt-2 flex justify-end">
                  <RemoveBtn label="Remover este valor" onClick={() => setEarnings((rs) => rs.filter((x) => x.key !== e.key))} />
                </div>
              )}
            </div>
          ))}
        </div>
        <button type="button" className="btn-ghost mt-3" onClick={() => setEarnings((rs) => [...rs, newEarning()])}>
          + Outra plataforma
        </button>
      </Section>

      <Section id="vendas" title="3. Vendas da vendinha">
        <div className="space-y-2">
          {items.map((i) => (
            <div key={i.key} className="grid grid-cols-[minmax(0,1fr)_3.5rem_5.5rem_2rem] items-end gap-2 sm:grid-cols-[minmax(0,1fr)_4rem_6rem_2rem]">
              <div className={sub}>
                <label className="label">Produto</label>
                <select className="input" value={i.productId} onChange={(ev) => pickProduct(i.key, ev.target.value)}>
                  <option value="">Item avulso…</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.stock})</option>
                  ))}
                </select>
                {!i.productId && (
                  <input className="input mt-1" placeholder="Nome do item" value={i.name} onChange={(ev) => patchItem(i.key, { name: ev.target.value })} />
                )}
              </div>
              <div className={sub}>
                <label className="label">Qtd</label>
                <input className="input" inputMode="numeric" value={i.qty} onChange={(ev) => patchItem(i.key, { qty: ev.target.value })} />
              </div>
              <div className={sub}>
                <label className="label">Preço un.</label>
                <input className="input" inputMode="decimal" placeholder="0,00" value={i.price} onChange={(ev) => patchItem(i.key, { price: ev.target.value })} />
              </div>
              <RemoveBtn label="Remover item" onClick={() => setItems((rs) => (rs.length > 1 ? rs.filter((x) => x.key !== i.key) : rs))} />
            </div>
          ))}
        </div>
        <button type="button" className="btn-ghost mt-3" onClick={() => setItems((rs) => [...rs, newItem()])}>
          + Item
        </button>
        <div className="mt-3 flex items-center justify-between rounded-xl bg-brand-soft px-4 py-2.5">
          <span className="text-sm text-muted">Total das vendas</span>
          <span className="font-semibold">{brl(saleTotal)}</span>
        </div>
      </Section>

      <Section id="despesas" title="4. Despesas">
        <div className="space-y-3">
          {expenses.map((x) => {
            const cats = x.scope === "CAR" ? CAR_CATEGORIES : STORE_CATEGORIES;
            return (
              <div key={x.key} className="rounded-xl border border-line p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className={sub}>
                    <label className="label">Tipo</label>
                    <select
                      className="input"
                      value={x.scope}
                      onChange={(ev) => {
                        const scope = ev.target.value as "CAR" | "STORE";
                        patchExpense(x.key, { scope, category: (scope === "CAR" ? CAR_CATEGORIES : STORE_CATEGORIES)[0] });
                      }}
                    >
                      <option value="CAR">Carro / corridas</option>
                      <option value="STORE">Vendinha</option>
                    </select>
                  </div>
                  <div className={sub}>
                    <label className="label">Categoria</label>
                    <select className="input" value={x.category} onChange={(ev) => patchExpense(x.key, { category: ev.target.value })}>
                      {cats.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className={sub}>
                    <label className="label">Valor (R$)</label>
                    <input className="input" inputMode="decimal" placeholder="0,00" value={x.amount} onChange={(ev) => patchExpense(x.key, { amount: ev.target.value })} />
                  </div>
                  <div className={sub}>
                    <label className="label">Descrição</label>
                    <input className="input" maxLength={200} placeholder="Ex.: Posto Shell, 20 L" value={x.description} onChange={(ev) => patchExpense(x.key, { description: ev.target.value })} />
                  </div>
                </div>
                {expenses.length > 1 && (
                  <div className="mt-2 flex justify-end">
                    <RemoveBtn label="Remover esta despesa" onClick={() => setExpenses((rs) => rs.filter((r) => r.key !== x.key))} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <button type="button" className="btn-ghost mt-3" onClick={() => setExpenses((rs) => [...rs, newExpense()])}>
          + Outra despesa
        </button>
      </Section>

      <div className="sticky bottom-[4.5rem] z-10 -mx-1 rounded-2xl border border-line bg-surface/95 p-3 shadow-[0_8px_24px_rgba(20,20,20,0.10)] backdrop-blur md:bottom-4">
        <button className="btn w-full">{filled ? "Salvar tudo" : "Salvar"}</button>
      </div>
    </form>
  );
}
