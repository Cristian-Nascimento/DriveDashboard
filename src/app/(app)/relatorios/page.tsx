import Link from "next/link";
import { requireUser } from "@/lib/session";
import { addDays, addMonths, isValidDate, labelDate, labelMonth, monthEnd, monthStart, todayStr, weekStart } from "@/lib/dates";
import { brl, num } from "@/lib/format";
import { getSummary } from "@/lib/stats";
import { Empty, PageHeader, Section, Stat, Tabs } from "@/components/ui";
import { MonthPicker } from "@/components/MonthPicker";

export const metadata = { title: "Relatórios · Pop Dashboard" };

export default async function Relatorios({ searchParams }: { searchParams: Promise<{ tipo?: string; ref?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const tipo = sp.tipo === "semanal" ? "semanal" : "mensal";
  const ref = isValidDate(sp.ref) ? sp.ref : todayStr();

  const from = tipo === "semanal" ? weekStart(ref) : monthStart(ref);
  const to = tipo === "semanal" ? addDays(from, 6) : monthEnd(ref);
  const prev = tipo === "semanal" ? addDays(from, -7) : addMonths(from, -1);
  const next = tipo === "semanal" ? addDays(from, 7) : addMonths(from, 1);
  const title = tipo === "semanal" ? `${labelDate(from, false)} a ${labelDate(to, false)}` : labelMonth(from);

  const s = await getSummary(user.id, from, to);
  const rows = s.days.filter((d) => d.rideGross + d.saleGross + d.carExpenses + d.storeExpenses + d.km + d.hours > 0);

  return (
    <>
      <PageHeader title="Relatórios" subtitle={title}>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs
            items={[
              { href: `/relatorios?tipo=semanal&ref=${ref}`, label: "Semanal", active: tipo === "semanal" },
              { href: `/relatorios?tipo=mensal&ref=${ref}`, label: "Mensal", active: tipo === "mensal" },
            ]}
          />
          <MonthPicker value={ref.slice(0, 7)} current={todayStr().slice(0, 7)} basePath="/relatorios" param="ref" suffix="-01" extra={{ tipo }} />
          <Link href={`/relatorios?tipo=${tipo}&ref=${prev}`} className="btn-ghost !px-3" aria-label="Período anterior">‹</Link>
          <Link href={`/relatorios?tipo=${tipo}&ref=${next}`} className="btn-ghost !px-3" aria-label="Próximo período">›</Link>
          <a href={`/relatorios/csv?from=${from}&to=${to}`} className="btn-ghost">Baixar planilha (CSV)</a>
        </div>
      </PageHeader>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Lucro líquido" value={brl(s.totalProfit)} tone={s.totalProfit >= 0 ? "pos" : "neg"} />
        <Stat label="Recebido (bruto)" value={brl(s.totalGross)} hint={`Taxas: ${brl(s.totalFees)}`} />
        <Stat label="Km / horas" value={`${num(s.km, 0)} km`} hint={`${num(s.hours, 1)} h · ${s.trips} corridas`} />
        <Stat label="Lucro / km" value={s.profitPerKm === null ? "–" : brl(s.profitPerKm)} hint={s.profitPerHour === null ? undefined : `${brl(s.profitPerHour)} por hora`} />
      </div>

      <Section title="Dia a dia">
        {rows.length === 0 ? (
          <Empty>Sem lançamentos neste período.</Empty>
        ) : (
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead>
                <tr>
                  <th className="th">Dia</th>
                  <th className="th text-right">Km</th>
                  <th className="th text-right">Horas</th>
                  <th className="th text-right">Corridas (líq.)</th>
                  <th className="th text-right">Vendinha (lucro)</th>
                  <th className="th text-right">Despesas</th>
                  <th className="th text-right">Lucro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {rows.map((d) => (
                  <tr key={d.date}>
                    <td className="td"><Link href={`/dia?date=${d.date}`} className="font-medium text-brand underline-offset-2 hover:underline">{labelDate(d.date)}</Link></td>
                    <td className="td text-right">{d.km ? num(d.km, 1) : "–"}</td>
                    <td className="td text-right">{d.hours ? num(d.hours, 1) : "–"}</td>
                    <td className="td text-right">{brl(d.rideNet)}</td>
                    <td className="td text-right">{brl(d.saleNet - d.cogs - d.storeExpenses)}</td>
                    <td className="td text-right text-muted">{brl(d.carExpenses)}</td>
                    <td className={`td text-right font-semibold ${d.profit < 0 ? "text-neg" : "text-pos"}`}>{brl(d.profit)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-line font-semibold">
                  <td className="td">Total</td>
                  <td className="td text-right">{num(s.km, 1)}</td>
                  <td className="td text-right">{num(s.hours, 1)}</td>
                  <td className="td text-right">{brl(s.rideNet)}</td>
                  <td className="td text-right">{brl(s.storeProfit)}</td>
                  <td className="td text-right">{brl(s.carExpenses)}</td>
                  <td className={`td text-right ${s.totalProfit < 0 ? "text-neg" : "text-pos"}`}>{brl(s.totalProfit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </Section>

      <Section title="Como o lucro é calculado">
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
          <li>Corridas: valor recebido − taxa da maquininha − despesas do carro.</li>
          <li>Vendinha: vendas − taxa da maquininha − custo das mercadorias − despesas da vendinha.</li>
          <li>Despesas mensais (seguro, IPVA, parcela) entram no dia em que forem lançadas; lance-as no dia do pagamento.</li>
        </ul>
      </Section>
    </>
  );
}
