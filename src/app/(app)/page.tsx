import Link from "next/link";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { installmentLabel } from "@/lib/bills";
import { addDays, labelDate, labelMonth, monthEnd, monthStart, todayStr, weekStart } from "@/lib/dates";
import { brl, num, pct } from "@/lib/format";
import { METHODS, PLATFORMS } from "@/lib/constants";
import { getSummary } from "@/lib/stats";
import { DailyChart } from "@/components/DailyChart";
import { MonthPicker } from "@/components/MonthPicker";
import { Empty, PageHeader, Section, Stat, Tabs } from "@/components/ui";

export const metadata = { title: "Painel · Pop Dashboard" };

const perUnit = (v: number | null, unit: string) => (v === null ? "–" : `${brl(v)}${unit}`);

export default async function Painel({ searchParams }: { searchParams: Promise<{ p?: string; mes?: string }> }) {
  const user = await requireUser();
  const { p, mes } = await searchParams;
  const period = p === "hoje" || p === "semana" ? p : "mes";
  const today = todayStr();
  const monthRef = mes && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ? `${mes}-01` : today;

  const [from, to, subtitle] =
    period === "hoje" ? [today, today, labelDate(today)]
    : period === "semana" ? [weekStart(today), addDays(weekStart(today), 6), "Semana atual (seg–dom)"]
    : [monthStart(monthRef), monthEnd(monthRef), labelMonth(monthRef)];

  const [s, dueSoon] = await Promise.all([
    getSummary(user.id, from, to),
    db.billInstallment.findMany({
      where: { userId: user.id, paidDate: null, dueDate: { lte: addDays(today, 7) } },
      include: { bill: true },
      orderBy: { dueDate: "asc" },
    }),
  ]);
  const hasData = s.totalGross > 0 || s.carExpenses > 0 || s.storeExpenses > 0;

  const chart = s.days
    .filter((d) => period !== "hoje" || d.date === today)
    .map((d) => ({
      label: labelDate(d.date, false),
      receita: (d.rideNet + d.saleNet) / 100,
      despesas: (d.carExpenses + d.storeExpenses + d.cogs) / 100,
      lucro: d.profit / 100,
    }));

  return (
    <>
      <PageHeader title={`Olá, ${user.name.split(" ")[0]}`} subtitle={subtitle}>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs
            items={[
              { href: "/?p=hoje", label: "Hoje", active: period === "hoje" },
              { href: "/?p=semana", label: "Semana", active: period === "semana" },
              { href: "/", label: "Mês", active: period === "mes" },
            ]}
          />
          <MonthPicker value={monthRef.slice(0, 7)} current={today.slice(0, 7)} basePath="/" param="mes" />
          <Link href="/dia" className="btn hidden sm:inline-flex">+ Lançar dia</Link>
        </div>
      </PageHeader>

      {dueSoon.length > 0 && (
        <Link href="/contas#proximas" className="card mb-4 block !border-warn/40 !bg-warn/5 transition hover:!bg-warn/10">
          <p className="text-sm font-semibold">
            {dueSoon.some((i) => i.dueDate < today) ? "Há contas vencidas" : "Contas vencendo nos próximos 7 dias"} · {brl(dueSoon.reduce((a, i) => a + i.amount, 0))}
          </p>
          <ul className="mt-1 space-y-0.5 text-sm text-muted">
            {dueSoon.slice(0, 4).map((i) => (
              <li key={i.id} className={i.dueDate < today ? "text-neg" : ""}>
                {labelDate(i.dueDate)} · {i.bill.name} ({installmentLabel(i.number, i.bill.totalInstallments)}) · {brl(i.amount)}
              </li>
            ))}
            {dueSoon.length > 4 && <li>e mais {dueSoon.length - 4}…</li>}
          </ul>
        </Link>
      )}

      {!hasData && (
        <div className="card mb-4 text-center">
          <p className="font-medium">Nenhum lançamento neste período</p>
          <p className="mt-1 text-sm text-muted">No fim do dia, registre km, ganhos, vendas e despesas.</p>
          <Link href="/dia" className="btn mt-4">Lançar o dia de hoje</Link>
        </div>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Lucro líquido" value={brl(s.totalProfit)} tone={s.totalProfit >= 0 ? "pos" : "neg"} hint={s.avgDailyProfit !== null ? `${brl(s.avgDailyProfit)} por dia ativo` : undefined} />
        <Stat label="Recebido (bruto)" value={brl(s.totalGross)} hint={`Corridas ${brl(s.rideGross)} · Vendinha ${brl(s.saleGross)}`} />
        <Stat label="Taxas de maquininha" value={brl(s.totalFees)} hint={s.totalGross ? `${pct(s.totalFees, s.totalGross)} do bruto` : undefined} />
        <Stat label="Despesas do carro" value={brl(s.carExpenses)} hint={s.rideNet ? `${pct(s.carExpenses, s.rideNet)} do ganho líquido` : undefined} />
      </div>

      <Section title="Indicadores das corridas" aside={<span className="text-xs text-muted">{num(s.km, 0)} km · {num(s.hours, 1)} h · {s.trips} corridas</span>}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {[
            ["Ganho / km", perUnit(s.netPerKm, "")],
            ["Custo / km", perUnit(s.costPerKm, "")],
            ["Lucro / km", perUnit(s.profitPerKm, "")],
            ["Ganho / hora", perUnit(s.netPerHour, "")],
            ["Lucro / hora", perUnit(s.profitPerHour, "")],
            ["Ganho / corrida", perUnit(s.netPerTrip, "")],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-brand-soft/60 p-3">
              <p className="text-xs text-muted">{label}</p>
              <p className="mt-0.5 text-lg font-semibold">{value}</p>
            </div>
          ))}
        </div>
        {s.km === 0 && <p className="mt-3 text-xs text-muted">Informe km e horas no fechamento do dia para ver os indicadores por km e por hora.</p>}
        <p className="mt-3 text-xs text-muted">
          Lucro das corridas: {brl(s.rideProfit)} (ganho líquido {brl(s.rideNet)} − despesas do carro {brl(s.carExpenses)}).
        </p>
      </Section>

      {period !== "hoje" && (
        <Section title="Evolução diária">
          <DailyChart data={chart} />
        </Section>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Section title="Vendinha">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-brand-soft/60 p-3">
              <p className="text-xs text-muted">Vendas (bruto)</p>
              <p className="text-lg font-semibold">{brl(s.saleGross)}</p>
            </div>
            <div className="rounded-xl bg-brand-soft/60 p-3">
              <p className="text-xs text-muted">Lucro da vendinha</p>
              <p className={`text-lg font-semibold ${s.storeProfit < 0 ? "text-neg" : "text-pos"}`}>{brl(s.storeProfit)}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-muted">
            Líquido das taxas {brl(s.saleNet)} − custo das mercadorias {brl(s.cogs)} − despesas da vendinha {brl(s.storeExpenses)}.
          </p>
        </Section>

        <Section title="Por forma de recebimento">
          {s.byMethod.length === 0 ? (
            <Empty>Sem recebimentos no período.</Empty>
          ) : (
            <ul className="space-y-3">
              {s.byMethod.map((m) => (
                <li key={m.method}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{METHODS[m.method as keyof typeof METHODS]}</span>
                    <span className="font-medium">{brl(m.gross)} <span className="text-muted">({pct(m.gross, s.totalGross)})</span></span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-brand-soft">
                    <div className="h-full rounded-full bg-brand" style={{ width: `${s.totalGross ? (m.gross / s.totalGross) * 100 : 0}%` }} />
                  </div>
                  {m.fee > 0 && <p className="mt-0.5 text-xs text-muted">taxa {brl(m.fee)} · líquido {brl(m.net)}</p>}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Por plataforma">
          {s.byPlatform.length === 0 ? (
            <Empty>Sem corridas no período.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {s.byPlatform.map((x) => (
                <li key={x.platform} className="flex justify-between py-2.5 text-sm">
                  <span>{PLATFORMS[x.platform as keyof typeof PLATFORMS]}{x.trips > 0 && <span className="text-muted"> · {x.trips} corridas</span>}</span>
                  <span className="font-medium">{brl(x.gross)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="Despesas por categoria">
          {s.byCategory.length === 0 ? (
            <Empty>Sem despesas no período.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {s.byCategory.map((x) => (
                <li key={x.scope + x.category} className="flex justify-between py-2.5 text-sm">
                  <span>{x.category}<span className="text-muted"> · {x.scope === "STORE" ? "vendinha" : "carro"}</span></span>
                  <span className="font-medium">{brl(x.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </>
  );
}
