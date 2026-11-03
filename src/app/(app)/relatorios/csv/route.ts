import { getUserId } from "@/lib/session";
import { isValidDate } from "@/lib/dates";
import { getSummary } from "@/lib/stats";

// CSV com ";" e vírgula decimal, para abrir direto no Excel em português
const n = (cents: number) => (cents / 100).toFixed(2).replace(".", ",");
const d = (v: number) => String(Math.round(v * 100) / 100).replace(".", ",");

export async function GET(req: Request) {
  const uid = await getUserId();
  if (!uid) return new Response("Não autorizado", { status: 401 });

  const url = new URL(req.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (!isValidDate(from) || !isValidDate(to) || from > to) return new Response("Período inválido", { status: 400 });

  const s = await getSummary(uid, from, to);
  const header = [
    "Data", "Km", "Horas", "Corridas", "Ganho bruto corridas", "Ganho liquido corridas",
    "Vendas bruto", "Vendas liquido", "Custo mercadorias", "Despesas carro", "Despesas vendinha", "Lucro",
  ];
  const lines = s.days.map((x) =>
    [
      x.date, d(x.km), d(x.hours), x.trips, n(x.rideGross), n(x.rideNet),
      n(x.saleGross), n(x.saleNet), n(x.cogs), n(x.carExpenses), n(x.storeExpenses), n(x.profit),
    ].join(";"),
  );
  lines.push(
    [
      "TOTAL", d(s.km), d(s.hours), s.trips, n(s.rideGross), n(s.rideNet),
      n(s.saleGross), n(s.saleNet), n(s.cogs), n(s.carExpenses), n(s.storeExpenses), n(s.totalProfit),
    ].join(";"),
  );

  const body = "﻿" + [header.join(";"), ...lines].join("\r\n");
  return new Response(body, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pop-dashboard_${from}_${to}.csv"`,
    },
  });
}
