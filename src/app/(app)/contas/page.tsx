import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { addDays, labelDate, labelMonth, monthEnd, monthStart, todayStr } from "@/lib/dates";
import { brl, centsToInput } from "@/lib/format";
import { BILL_TYPES } from "@/lib/constants";
import { installmentLabel, topUpRecurringBills } from "@/lib/bills";
import { deleteBill, payInstallment, unpayInstallment, updateBill, updateInstallment } from "@/app/actions/bills";
import { BillForm } from "@/components/BillForm";
import { Empty, PageHeader, Section, Stat } from "@/components/ui";

export const metadata = { title: "Contas · Pop Dashboard" };

export default async function ContasPage({ searchParams }: { searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const today = todayStr();
  await topUpRecurringBills(user.id);

  const [pending, paid, bills] = await Promise.all([
    db.billInstallment.findMany({
      where: { userId: user.id, paidDate: null },
      include: { bill: true },
      orderBy: [{ dueDate: "asc" }, { number: "asc" }],
    }),
    db.billInstallment.findMany({
      where: { userId: user.id, paidDate: { not: null } },
      include: { bill: true },
      orderBy: { paidDate: "desc" },
      take: 8,
    }),
    db.bill.findMany({
      where: { userId: user.id, active: true },
      include: { installments: { orderBy: { number: "asc" } } },
      orderBy: { name: "asc" },
    }),
  ]);

  const overdue = pending.filter((i) => i.dueDate < today);
  const week = pending.filter((i) => i.dueDate >= today && i.dueDate <= addDays(today, 7));
  const thisMonth = pending.filter((i) => i.dueDate >= monthStart(today) && i.dueDate <= monthEnd(today));
  const sum = (l: { amount: number }[]) => l.reduce((s, i) => s + i.amount, 0);

  // próximas parcelas (vencidas + 3 meses), agrupadas por mês
  const horizon = addDays(today, 92);
  const upcoming = pending.filter((i) => i.dueDate <= horizon);
  const groups = new Map<string, typeof upcoming>();
  for (const i of upcoming) {
    const k = i.dueDate < today ? "overdue" : i.dueDate.slice(0, 7);
    groups.set(k, [...(groups.get(k) ?? []), i]);
  }

  return (
    <>
      <PageHeader title="Contas do mês" subtitle="Parcelas, financiamentos e contas fixas" />

      {sp.ok && <p className="mb-4 rounded-xl bg-pos/10 px-4 py-2.5 text-sm text-pos">Salvo.</p>}
      {sp.erro && <p className="mb-4 rounded-xl bg-neg/10 px-4 py-2.5 text-sm text-neg">Confira os campos: nome, valor, tipo e vencimento são obrigatórios.</p>}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Vencidas" value={brl(sum(overdue))} hint={`${overdue.length} parcela(s)`} tone={overdue.length ? "neg" : undefined} />
        <Stat label="Próximos 7 dias" value={brl(sum(week))} hint={`${week.length} parcela(s)`} />
        <Stat label="A pagar neste mês" value={brl(sum(thisMonth)) } hint={`${thisMonth.length} parcela(s)`} />
        <Stat label="Contas ativas" value={String(bills.length)} />
      </div>

      <Section id="nova" title="Cadastrar conta">
        <BillForm today={today} />
      </Section>

      <Section id="proximas" title="Próximas parcelas">
        {upcoming.length === 0 ? (
          <Empty>Nenhuma parcela a pagar nos próximos 3 meses.</Empty>
        ) : (
          [...groups.entries()].map(([key, list]) => (
            <div key={key} className="mb-5 last:mb-0">
              <h3 className={`mb-1 text-sm font-semibold first-letter:uppercase ${key === "overdue" ? "text-neg" : "text-muted"}`}>
                {key === "overdue" ? "Vencidas" : `${labelMonth(key + "-01")} · ${brl(sum(list))}`}
              </h3>
              <ul className="divide-y divide-line">
                {list.map((i) => (
                  <li key={i.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {i.bill.name} <span className="text-muted">· {installmentLabel(i.number, i.bill.totalInstallments)}</span>
                        </p>
                        <p className={`text-xs ${i.dueDate < today ? "font-medium text-neg" : "text-muted"}`}>
                          {i.dueDate < today ? "Venceu em " : "Vence "} {labelDate(i.dueDate)} · {i.bill.category}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-semibold">{brl(i.amount)}</span>
                    </div>
                    <details className="mt-1.5">
                      <summary className="cursor-pointer text-sm font-medium text-brand">Marcar como paga</summary>
                      <form action={payInstallment} className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                        <input type="hidden" name="id" value={i.id} />
                        <div>
                          <label className="label">Data do pagamento</label>
                          <input type="date" name="paidDate" className="input" defaultValue={today} />
                        </div>
                        <div>
                          <label className="label">Valor pago (R$)</label>
                          <input name="paidAmount" className="input" inputMode="decimal" defaultValue={centsToInput(i.amount)} />
                        </div>
                        <div className="col-span-2 flex items-end sm:col-span-1">
                          <button className="btn w-full">Confirmar pagamento</button>
                        </div>
                      </form>
                    </details>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </Section>

      <Section id="pagas" title="Pagas recentemente">
        {paid.length === 0 ? (
          <Empty>Nenhum pagamento registrado ainda.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {paid.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {i.bill.name} <span className="text-muted">· {installmentLabel(i.number, i.bill.totalInstallments)}</span>
                  </p>
                  <p className="text-xs text-muted">Pago em {labelDate(i.paidDate!)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="text-sm font-semibold">{brl(i.paidAmount ?? i.amount)}</span>
                  <form action={unpayInstallment}>
                    <input type="hidden" name="id" value={i.id} />
                    <button className="btn-danger">Desfazer</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="contas" title="Todas as contas">
        {bills.length === 0 ? (
          <Empty>Nenhuma conta cadastrada.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {bills.map((b) => {
              const paidN = b.installments.filter((i) => i.paidDate).length;
              const total = b.totalInstallments;
              const left = b.installments.filter((i) => !i.paidDate);
              const nextDue = left[0];
              return (
                <li key={b.id} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{b.name}</p>
                      <p className="text-xs text-muted">
                        {b.category} · {b.scope === "STORE" ? "vendinha" : "carro"} · {brl(b.amount)}/mês
                      </p>
                    </div>
                    <span className="rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand">
                      {total
                        ? `${b.startNumber - 1 + paidN}/${total} pagas · faltam ${total - (b.startNumber - 1 + paidN)}`
                        : "Fixa mensal"}
                    </span>
                  </div>
                  {nextDue && <p className="mt-1 text-xs text-muted">Próximo vencimento: {labelDate(nextDue.dueDate)}</p>}

                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium text-brand">Parcelas e edição</summary>
                    <div className="mt-3 space-y-4">
                      <form action={updateBill} className="grid gap-2 rounded-xl bg-brand-soft/50 p-3 sm:grid-cols-4">
                        <input type="hidden" name="id" value={b.id} />
                        <input name="name" className="input sm:col-span-2" defaultValue={b.name} required aria-label="Nome" />
                        <select name="category" className="input" defaultValue={b.category} aria-label="Tipo">
                          {BILL_TYPES.map((t) => <option key={t}>{t}</option>)}
                        </select>
                        <select name="scope" className="input" defaultValue={b.scope} aria-label="Pertence a">
                          <option value="CAR">Carro</option>
                          <option value="STORE">Vendinha</option>
                        </select>
                        <input name="amount" className="input" inputMode="decimal" defaultValue={centsToInput(b.amount)} aria-label="Valor" />
                        <p className="self-center text-xs text-muted sm:col-span-2">O novo valor vale para as parcelas ainda não pagas.</p>
                        <button className="btn">Salvar conta</button>
                      </form>

                      <ul className="divide-y divide-line rounded-xl border border-line">
                        {b.installments.map((i) => (
                          <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                            <span className="font-medium">{installmentLabel(i.number, total)}</span>
                            {i.paidDate ? (
                              <span className="text-pos">Paga em {labelDate(i.paidDate, false)} · {brl(i.paidAmount ?? i.amount)}</span>
                            ) : (
                              <form action={updateInstallment} className="flex items-center gap-2">
                                <input type="hidden" name="id" value={i.id} />
                                <input type="date" name="dueDate" defaultValue={i.dueDate} className="input !w-auto !py-1.5" aria-label="Vencimento" />
                                <input name="amount" defaultValue={centsToInput(i.amount)} className="input !w-24 !py-1.5" inputMode="decimal" aria-label="Valor" />
                                <button className="btn-ghost !px-3 !py-1.5">Salvar</button>
                              </form>
                            )}
                          </li>
                        ))}
                      </ul>

                      <form action={deleteBill}>
                        <input type="hidden" name="id" value={b.id} />
                        <button className="btn-danger">Excluir conta e parcelas não pagas</button>
                      </form>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </>
  );
}
