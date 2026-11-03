"use client";

import { useState } from "react";
import { saveDay } from "@/app/actions/data";
import { CAR_CATEGORIES, CARD_METHODS, METHODS, PLATFORMS, SALE_METHODS, STORE_CATEGORIES } from "@/lib/constants";
import { brl, centsToInput, parseDecimal, parseMoney } from "@/lib/format";
import { Section } from "./ui";

type Machine = { id: string; name: string };
type Product = { id: string; name: string; price: number; stock: number };
type Pay = { method: string; machineId: string };

type EarningRow = Pay & { key: number; platform: string; gross: string; trips: string };
type ItemRow = { key: number; productId: string; name: string; qty: string; price: string };
type SaleBlock = Pay & { key: number; items: ItemRow[] };
type ExpenseRow = { key: number; scope: "CAR" | "STORE"; category: string; amount: string; description: string };

let seq = 1;
const PLATFORM_KEYS = Object.keys(PLATFORMS);

const lbl = "label";
const sub = "min-w-0"; // evita que selects/inputs estiquem a grade e criem rolagem lateral

function PaySelect({
  methods,
  machines,
  value,
  onChange,
}: {
  methods: readonly string[];
  machines: Machine[];
  value: Pay;
  onChange: (p: Pay) => void;
}) {
  const needsMachine = (CARD_METHODS.includes(value.method) || value.method === "PIX") && machines.length > 0;
  return (
    <>
      <div className={sub}>
        <label className={lbl}>Forma de recebimento</label>
        <select className="input" value={value.method} onChange={(e) => onChange({ ...value, method: e.target.value })}>
          {methods.map((m) => (
            <option key={m} value={m}>{METHODS[m as keyof typeof METHODS]}</option>
          ))}
        </select>
      </div>
      {needsMachine && (
        <div className={sub}>
          <label className={lbl}>Maquininha</label>
          <select className="input" value={value.machineId} onChange={(e) => onChange({ ...value, machineId: e.target.value })}>
            {machines.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
            {value.method === "PIX" && <option value="">Pix direto (sem taxa)</option>}
          </select>
        </div>
      )}
    </>
  );
}

function RemoveBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="btn-danger !px-2.5 !py-1.5 text-base">
      ✕
    </button>
  );
}

export function DayForm({
  date,
  machines,
  products,
  workDay,
}: {
  date: string;
  machines: Machine[];
  products: Product[];
  workDay: { km: string; hours: string; note: string };
}) {
  const firstMachine = machines[0]?.id ?? "";

  const newEarning = (): EarningRow => ({ key: seq++, platform: PLATFORM_KEYS[0], method: "APP", machineId: firstMachine, gross: "", trips: "" });
  const newItem = (): ItemRow => ({ key: seq++, productId: "", name: "", qty: "1", price: "" });
  const newSale = (): SaleBlock => ({ key: seq++, method: "PIX", machineId: firstMachine, items: [newItem()] });
  const newExpense = (): ExpenseRow => ({ key: seq++, scope: "CAR", category: CAR_CATEGORIES[0], amount: "", description: "" });

  const [work, setWork] = useState(workDay);
  const [earnings, setEarnings] = useState<EarningRow[]>(() => [newEarning()]);
  const [sales, setSales] = useState<SaleBlock[]>(() => [newSale()]);
  const [expenses, setExpenses] = useState<ExpenseRow[]>(() => [newExpense()]);

  const patchEarning = (key: number, p: Partial<EarningRow>) => setEarnings((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const patchSale = (key: number, p: Partial<SaleBlock>) => setSales((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));
  const patchItem = (saleKey: number, key: number, p: Partial<ItemRow>) =>
    setSales((rs) => rs.map((s) => (s.key === saleKey ? { ...s, items: s.items.map((i) => (i.key === key ? { ...i, ...p } : i)) } : s)));
  const patchExpense = (key: number, p: Partial<ExpenseRow>) => setExpenses((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)));

  const pickProduct = (saleKey: number, key: number, productId: string) => {
    const p = products.find((x) => x.id === productId);
    patchItem(saleKey, key, { productId, name: p?.name ?? "", price: p ? centsToInput(p.price) : "" });
  };

  const saleItems = (s: SaleBlock) =>
    s.items
      .map((i) => ({
        productId: i.productId || null,
        name: i.name.trim() || "Item avulso",
        qty: Math.max(1, Math.round(Number(i.qty) || 1)),
        unitPrice: parseMoney(i.price),
      }))
      .filter((i) => i.unitPrice > 0);
  const saleTotal = (s: SaleBlock) => saleItems(s).reduce((a, i) => a + i.qty * i.unitPrice, 0);

  // só viaja o que foi preenchido; linhas em branco são ignoradas
  const payload = JSON.stringify({
    workDay: work,
    earnings: earnings
      .filter((e) => parseMoney(e.gross) > 0)
      .map((e) => ({
        platform: e.platform,
        method: e.method,
        machineId: e.machineId || null,
        gross: parseMoney(e.gross),
        trips: Math.max(0, Math.round(parseDecimal(e.trips))),
      })),
    sales: sales
      .map((s) => ({ method: s.method, machineId: s.machineId || null, items: saleItems(s) }))
      .filter((s) => s.items.length > 0),
    expenses: expenses
      .filter((x) => parseMoney(x.amount) > 0)
      .map((x) => ({ scope: x.scope, category: x.category, amount: parseMoney(x.amount), description: x.description.trim() })),
  });

  const filled =
    earnings.some((e) => parseMoney(e.gross) > 0) ||
    sales.some((s) => saleTotal(s) > 0) ||
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
            <label className={lbl}>Km rodados</label>
            <input className="input" inputMode="decimal" placeholder="0" value={work.km} onChange={(e) => setWork({ ...work, km: e.target.value })} />
          </div>
          <div className={sub}>
            <label className={lbl}>Horas online</label>
            <input className="input" inputMode="decimal" placeholder="0" value={work.hours} onChange={(e) => setWork({ ...work, hours: e.target.value })} />
          </div>
          <div className={sub}>
            <label className={lbl}>Observação</label>
            <input className="input" maxLength={300} value={work.note} onChange={(e) => setWork({ ...work, note: e.target.value })} />
          </div>
        </div>
      </Section>

      <Section id="ganhos" title="2. Ganhos de corridas">
        <div className="space-y-3">
          {earnings.map((e) => (
            <div key={e.key} className="rounded-xl border border-line p-3">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div className={sub}>
                  <label className={lbl}>Plataforma</label>
                  <select className="input" value={e.platform} onChange={(ev) => patchEarning(e.key, { platform: ev.target.value })}>
                    {Object.entries(PLATFORMS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <PaySelect
                  methods={["APP", "CASH", "PIX", "DEBIT", "CREDIT", "CREDIT_INST"]}
                  machines={machines}
                  value={{ method: e.method, machineId: e.machineId }}
                  onChange={(p) => patchEarning(e.key, p)}
                />
                <div className={sub}>
                  <label className={lbl}>Valor recebido (R$)</label>
                  <input className="input" inputMode="decimal" placeholder="0,00" value={e.gross} onChange={(ev) => patchEarning(e.key, { gross: ev.target.value })} />
                </div>
                <div className={sub}>
                  <label className={lbl}>Nº de corridas</label>
                  <input className="input" inputMode="numeric" placeholder="0" value={e.trips} onChange={(ev) => patchEarning(e.key, { trips: ev.target.value })} />
                </div>
              </div>
              {earnings.length > 1 && (
                <div className="mt-2 flex justify-end">
                  <RemoveBtn label="Remover este ganho" onClick={() => setEarnings((rs) => rs.filter((x) => x.key !== e.key))} />
                </div>
              )}
            </div>
          ))}
        </div>
        <button type="button" className="btn-ghost mt-3" onClick={() => setEarnings((rs) => [...rs, newEarning()])}>
          + Outro ganho
        </button>
      </Section>

      <Section id="vendas" title="3. Vendas da vendinha">
        <div className="space-y-3">
          {sales.map((s, idx) => (
            <div key={s.key} className="rounded-xl border border-line p-3">
              {sales.length > 1 && <p className="mb-2 text-xs font-medium text-muted">Venda {idx + 1}</p>}
              <div className="space-y-2">
                {s.items.map((i) => (
                  <div key={i.key} className="grid grid-cols-[minmax(0,1fr)_3.5rem_5.5rem_2rem] items-end gap-2 sm:grid-cols-[minmax(0,1fr)_4rem_6rem_2rem]">
                    <div className={sub}>
                      <label className={lbl}>Produto</label>
                      <select className="input" value={i.productId} onChange={(ev) => pickProduct(s.key, i.key, ev.target.value)}>
                        <option value="">Item avulso…</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>{p.name} ({p.stock})</option>
                        ))}
                      </select>
                      {!i.productId && (
                        <input className="input mt-1" placeholder="Nome do item" value={i.name} onChange={(ev) => patchItem(s.key, i.key, { name: ev.target.value })} />
                      )}
                    </div>
                    <div className={sub}>
                      <label className={lbl}>Qtd</label>
                      <input className="input" inputMode="numeric" value={i.qty} onChange={(ev) => patchItem(s.key, i.key, { qty: ev.target.value })} />
                    </div>
                    <div className={sub}>
                      <label className={lbl}>Preço un.</label>
                      <input className="input" inputMode="decimal" placeholder="0,00" value={i.price} onChange={(ev) => patchItem(s.key, i.key, { price: ev.target.value })} />
                    </div>
                    <RemoveBtn
                      label="Remover item"
                      onClick={() => patchSale(s.key, { items: s.items.length > 1 ? s.items.filter((x) => x.key !== i.key) : s.items })}
                    />
                  </div>
                ))}
              </div>
              <button type="button" className="btn-ghost mt-2 !py-1.5" onClick={() => patchSale(s.key, { items: [...s.items, newItem()] })}>
                + Item
              </button>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <PaySelect methods={SALE_METHODS} machines={machines} value={{ method: s.method, machineId: s.machineId }} onChange={(p) => patchSale(s.key, p)} />
              </div>

              <div className="mt-3 flex items-center justify-between rounded-xl bg-brand-soft px-4 py-2.5">
                <span className="text-sm text-muted">Total da venda</span>
                <span className="font-semibold">{brl(saleTotal(s))}</span>
              </div>
              {sales.length > 1 && (
                <div className="mt-2 flex justify-end">
                  <RemoveBtn label="Remover esta venda" onClick={() => setSales((rs) => rs.filter((x) => x.key !== s.key))} />
                </div>
              )}
            </div>
          ))}
        </div>
        <button type="button" className="btn-ghost mt-3" onClick={() => setSales((rs) => [...rs, newSale()])}>
          + Outra venda
        </button>
      </Section>

      <Section id="despesas" title="4. Despesas">
        <div className="space-y-3">
          {expenses.map((x) => {
            const cats = x.scope === "CAR" ? CAR_CATEGORIES : STORE_CATEGORIES;
            return (
              <div key={x.key} className="rounded-xl border border-line p-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className={sub}>
                    <label className={lbl}>Tipo</label>
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
                    <label className={lbl}>Categoria</label>
                    <select className="input" value={x.category} onChange={(ev) => patchExpense(x.key, { category: ev.target.value })}>
                      {cats.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className={sub}>
                    <label className={lbl}>Valor (R$)</label>
                    <input className="input" inputMode="decimal" placeholder="0,00" value={x.amount} onChange={(ev) => patchExpense(x.key, { amount: ev.target.value })} />
                  </div>
                  <div className={sub}>
                    <label className={lbl}>Descrição</label>
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
