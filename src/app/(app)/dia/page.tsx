import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { addDays, isValidDate, labelDate, todayStr } from "@/lib/dates";
import { brl, num } from "@/lib/format";
import { PLATFORMS } from "@/lib/constants";
import { getSummary } from "@/lib/stats";
import { deleteEarning, deleteExpense, deleteSale } from "@/app/actions/data";
import { Empty, PageHeader, Section, Stat } from "@/components/ui";
import { DayForm } from "@/components/DayForm";
import { DayDateNav } from "@/components/DayDateNav";

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

export default async function DiaPage({ searchParams }: { searchParams: Promise<{ date?: string; ok?: string; s?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const date = isValidDate(sp.date) ? sp.date : todayStr();

  const [summary, workDay, earnings, sales, expenses, products] = await Promise.all([
    getSummary(user.id, date, date),
    db.workDay.findUnique({ where: { userId_date: { userId: user.id, date } } }),
    db.earning.findMany({ where: { userId: user.id, date }, orderBy: { createdAt: "asc" } }),
    db.sale.findMany({ where: { userId: user.id, date }, include: { items: true }, orderBy: { createdAt: "asc" } }),
    db.expense.findMany({ where: { userId: user.id, date }, orderBy: { createdAt: "asc" } }),
    db.product.findMany({ where: { userId: user.id, active: true }, orderBy: { name: "asc" } }),
  ]);

  const isToday = date === todayStr();
  const hasEntries = earnings.length + sales.length + expenses.length > 0;

  return (
    <>
      <PageHeader title="Lançar o dia" subtitle={labelDate(date)} />

      <DayDateNav date={date} prev={addDays(date, -1)} next={addDays(date, 1)} isToday={isToday} />

      {sp.ok === "vazio" && <p className="mb-4 rounded-xl bg-brand-soft px-4 py-2.5 text-sm text-muted">Nada novo para salvar.</p>}
      {sp.ok && sp.ok !== "vazio" && <p className="mb-4 rounded-xl bg-pos/10 px-4 py-2.5 text-sm text-pos">Salvo.</p>}

      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Corridas" value={brl(summary.rideGross)} />
        <Stat label="Vendinha" value={brl(summary.saleGross)} />
        <Stat label="Despesas + custo vendinha" value={brl(summary.carExpenses + summary.storeExpenses + summary.cogs)} />
        <Stat label="Lucro do dia" value={brl(summary.totalProfit)} tone={summary.totalProfit >= 0 ? "pos" : "neg"} />
      </div>

      {products.length === 0 && (
        <p className="mb-3 text-sm text-muted">
          Dica: cadastre seus produtos em <Link href="/vendinha" className="font-medium text-brand underline">Vendinha</Link> para controlar estoque e lucro. Você também pode lançar itens avulsos.
        </p>
      )}

      {/* a chave muda a cada salvamento (s) para limpar as linhas já lançadas */}
      <DayForm
        key={`${date}-${sp.s ?? ""}`}
        date={date}
        products={products.map((p) => ({ id: p.id, name: p.name, price: p.price, stock: p.stock }))}
        workDay={{
          km: workDay?.km ? num(workDay.km, 1).replace(/\./g, "") : "",
          hours: workDay?.hours ? num(workDay.hours, 2).replace(/\./g, "") : "",
          note: workDay?.note ?? "",
        }}
      />

      <Section id="lancado" title="Lançado neste dia">
        {!hasEntries ? (
          <Empty>Nada lançado neste dia ainda.</Empty>
        ) : (
          <div className="space-y-5">
            {earnings.length > 0 && (
              <div>
                <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Ganhos</h3>
                <ul className="divide-y divide-line">
                  {earnings.map((e) => (
                    <li key={e.id} className="flex items-start justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {PLATFORMS[e.platform as keyof typeof PLATFORMS]}
                          {e.trips > 0 && <span className="text-muted"> · {e.trips} corr.</span>}
                        </p>
                        {e.fee > 0 && <p className="truncate text-xs text-muted">lançamento antigo · taxa {brl(e.fee)} · líquido {brl(e.net)}</p>}
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-2">
                        <span className="text-sm font-semibold">{brl(e.gross)}</span>
                        <EditLink tipo="ganho" id={e.id} />
                        <DeleteBtn action={deleteEarning} id={e.id} date={date} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {sales.length > 0 && (
              <div>
                <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Vendas</h3>
                <ul className="divide-y divide-line">
                  {sales.map((s) => (
                    <li key={s.id} className="flex items-start justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{s.items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</p>
                        <p className="truncate text-xs text-muted">
                          lucro {brl(s.net - s.cogs)}
                          {s.fee > 0 && ` · taxa antiga ${brl(s.fee)}`}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-2">
                        <span className="text-sm font-semibold">{brl(s.gross)}</span>
                        <EditLink tipo="venda" id={s.id} />
                        <DeleteBtn action={deleteSale} id={s.id} date={date} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {expenses.length > 0 && (
              <div>
                <h3 className="mb-1 text-xs font-medium uppercase tracking-wide text-muted">Despesas</h3>
                <ul className="divide-y divide-line">
                  {expenses.map((x) => (
                    <li key={x.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{x.category}</p>
                        <p className="truncate text-xs text-muted">{x.scope === "STORE" ? "Vendinha" : "Carro"}{x.description && ` · ${x.description}`}</p>
                      </div>
                      <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-2">
                        <span className="text-sm font-semibold text-neg">− {brl(x.amount)}</span>
                        <EditLink tipo="despesa" id={x.id} />
                        <DeleteBtn action={deleteExpense} id={x.id} date={date} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </Section>
    </>
  );
}
