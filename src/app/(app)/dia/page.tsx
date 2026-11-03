import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { addDays, isValidDate, labelDate, todayStr } from "@/lib/dates";
import { brl, num } from "@/lib/format";
import { METHODS, PLATFORMS } from "@/lib/constants";
import { getSummary } from "@/lib/stats";
import { addEarning, deleteEarning, deleteExpense, deleteSale, saveWorkDay } from "@/app/actions/data";
import { Empty, PageHeader, Section, Stat } from "@/components/ui";
import { PayFields } from "@/components/PayFields";
import { SaleForm } from "@/components/SaleForm";
import { ExpenseForm } from "@/components/ExpenseForm";

export const metadata = { title: "Lançar dia · Pop Dashboard" };

function DeleteBtn({ action, id, date }: { action: (f: FormData) => Promise<void>; id: string; date: string }) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="date" value={date} />
      <button className="btn-danger" aria-label="Excluir">Excluir</button>
    </form>
  );
}

function EditLink({ tipo, id }: { tipo: string; id: string }) {
  return (
    <Link href={`/editar/${tipo}/${id}`} className="rounded-lg px-2 py-1 text-xs font-medium text-brand hover:bg-brand-soft">
      Editar
    </Link>
  );
}

export default async function DiaPage({ searchParams }: { searchParams: Promise<{ date?: string; ok?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const date = isValidDate(sp.date) ? sp.date : todayStr();

  const [summary, workDay, earnings, sales, expenses, machines, products] = await Promise.all([
    getSummary(user.id, date, date),
    db.workDay.findUnique({ where: { userId_date: { userId: user.id, date } } }),
    db.earning.findMany({ where: { userId: user.id, date }, include: { machine: true }, orderBy: { createdAt: "asc" } }),
    db.sale.findMany({ where: { userId: user.id, date }, include: { items: true, machine: true }, orderBy: { createdAt: "asc" } }),
    db.expense.findMany({ where: { userId: user.id, date }, orderBy: { createdAt: "asc" } }),
    db.machine.findMany({ where: { userId: user.id, active: true }, orderBy: { name: "asc" } }),
    db.product.findMany({ where: { userId: user.id, active: true }, orderBy: { name: "asc" } }),
  ]);

  const machineOpts = machines.map((m) => ({ id: m.id, name: m.name }));
  const isToday = date === todayStr();

  return (
    <>
      <PageHeader title="Lançar o dia" subtitle={labelDate(date)}>
        <div className="flex items-center gap-2">
          <Link href={`/dia?date=${addDays(date, -1)}`} className="btn-ghost !px-3" aria-label="Dia anterior">‹</Link>
          <form method="get" className="flex items-center gap-2">
            <input type="date" name="date" defaultValue={date} className="input !w-auto" aria-label="Data" />
            <button className="btn-ghost">Ir</button>
          </form>
          <Link href={`/dia?date=${addDays(date, 1)}`} className="btn-ghost !px-3" aria-label="Próximo dia">›</Link>
          {!isToday && <Link href="/dia" className="btn-ghost">Hoje</Link>}
        </div>
      </PageHeader>

      {sp.ok && <p className="mb-4 rounded-xl bg-pos/10 px-4 py-2.5 text-sm text-pos">Salvo.</p>}

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Recebido (bruto)" value={brl(summary.totalGross)} />
        <Stat label="Taxas das maquininhas" value={brl(summary.totalFees)} />
        <Stat label="Despesas + custo vendinha" value={brl(summary.carExpenses + summary.storeExpenses + summary.cogs)} />
        <Stat label="Lucro do dia" value={brl(summary.totalProfit)} tone={summary.totalProfit >= 0 ? "pos" : "neg"} />
      </div>

      <Section id="fechamento" title="1. Fechamento do dia">
        <form action={saveWorkDay} className="grid gap-3 sm:grid-cols-3">
          <input type="hidden" name="date" value={date} />
          <div>
            <label className="label">Km rodados</label>
            <input name="km" className="input" inputMode="decimal" placeholder="0" defaultValue={workDay?.km ? num(workDay.km, 1).replace(/\./g, "") : ""} />
          </div>
          <div>
            <label className="label">Horas online</label>
            <input name="hours" className="input" inputMode="decimal" placeholder="0" defaultValue={workDay?.hours ? num(workDay.hours, 2).replace(/\./g, "") : ""} />
          </div>
          <div>
            <label className="label">Observação</label>
            <input name="note" className="input" maxLength={300} defaultValue={workDay?.note ?? ""} />
          </div>
          <div className="sm:col-span-3">
            <button className="btn w-full sm:w-auto">Salvar fechamento</button>
          </div>
        </form>
      </Section>

      <Section id="ganhos" title="2. Ganhos de corridas">
        <form action={addEarning} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <input type="hidden" name="date" value={date} />
          <div>
            <label className="label">Plataforma</label>
            <select name="platform" className="input">
              {Object.entries(PLATFORMS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <PayFields methods={["APP", "CASH", "PIX", "DEBIT", "CREDIT", "CREDIT_INST"]} machines={machineOpts} defaultMethod="APP" />
          <div>
            <label className="label">Valor recebido (R$)</label>
            <input name="gross" className="input" inputMode="decimal" placeholder="0,00" required />
          </div>
          <div>
            <label className="label">Nº de corridas</label>
            <input name="trips" className="input" inputMode="numeric" placeholder="0" />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <button className="btn w-full sm:w-auto">Adicionar ganho</button>
          </div>
        </form>

        <div className="mt-4">
          {earnings.length === 0 ? (
            <Empty>Nenhum ganho lançado neste dia.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr><th className="th">Plataforma</th><th className="th">Forma</th><th className="th text-right">Bruto</th><th className="th text-right">Taxa</th><th className="th text-right">Líquido</th><th className="th" /></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {earnings.map((e) => (
                    <tr key={e.id}>
                      <td className="td">{PLATFORMS[e.platform as keyof typeof PLATFORMS]}{e.trips > 0 && <span className="text-muted"> · {e.trips} corr.</span>}</td>
                      <td className="td">{METHODS[e.method as keyof typeof METHODS]}{e.machine && <span className="block text-xs text-muted">{e.machine.name}</span>}</td>
                      <td className="td text-right">{brl(e.gross)}</td>
                      <td className="td text-right text-muted">{e.fee ? `− ${brl(e.fee)}` : "–"}</td>
                      <td className="td text-right font-medium">{brl(e.net)}</td>
                      <td className="td"><div className="flex justify-end gap-1"><EditLink tipo="ganho" id={e.id} /><DeleteBtn action={deleteEarning} id={e.id} date={date} /></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Section>

      <Section id="vendas" title="3. Vendas da vendinha">
        {products.length === 0 && (
          <p className="mb-3 text-sm text-muted">
            Dica: cadastre seus produtos em <Link href="/vendinha" className="font-medium text-brand underline">Vendinha</Link> para controlar estoque e lucro. Você também pode lançar itens avulsos.
          </p>
        )}
        <SaleForm date={date} products={products.map((p) => ({ id: p.id, name: p.name, price: p.price, stock: p.stock }))} machines={machineOpts} />

        <div className="mt-4">
          {sales.length === 0 ? (
            <Empty>Nenhuma venda lançada neste dia.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {sales.map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{s.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</p>
                    <p className="text-xs text-muted">
                      {METHODS[s.method as keyof typeof METHODS]}{s.machine ? ` · ${s.machine.name}` : ""}
                      {s.fee > 0 && ` · taxa ${brl(s.fee)}`} · lucro {brl(s.net - s.cogs)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-semibold">{brl(s.gross)}</span>
                    <EditLink tipo="venda" id={s.id} />
                    <DeleteBtn action={deleteSale} id={s.id} date={date} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>

      <Section id="despesas" title="4. Despesas">
        <ExpenseForm date={date} />
        <div className="mt-4">
          {expenses.length === 0 ? (
            <Empty>Nenhuma despesa lançada neste dia.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {expenses.map((x) => (
                <li key={x.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{x.category}</p>
                    <p className="truncate text-xs text-muted">{x.scope === "STORE" ? "Vendinha" : "Carro"}{x.description && ` · ${x.description}`}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <span className="text-sm font-semibold text-neg">− {brl(x.amount)}</span>
                    <EditLink tipo="despesa" id={x.id} />
                    <DeleteBtn action={deleteExpense} id={x.id} date={date} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Section>
    </>
  );
}
