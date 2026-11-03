import { db } from "./db";
import { eachDay } from "./dates";

export type DayRow = {
  date: string;
  rideGross: number;
  rideNet: number;
  saleGross: number;
  saleNet: number;
  cogs: number;
  carExpenses: number;
  storeExpenses: number;
  km: number;
  hours: number;
  trips: number;
  profit: number;
};

export type Summary = {
  from: string;
  to: string;
  // corridas
  rideGross: number;
  rideFee: number;
  rideNet: number;
  carExpenses: number;
  rideProfit: number;
  trips: number;
  km: number;
  hours: number;
  workedDays: number;
  // vendinha
  saleGross: number;
  saleFee: number;
  saleNet: number;
  cogs: number;
  storeExpenses: number;
  storeProfit: number;
  // total
  totalGross: number;
  totalFees: number;
  totalProfit: number;
  // indicadores (centavos por unidade; null quando não há base)
  netPerKm: number | null;
  profitPerKm: number | null;
  costPerKm: number | null;
  netPerHour: number | null;
  profitPerHour: number | null;
  netPerTrip: number | null;
  avgDailyProfit: number | null;
  days: DayRow[];
  byPlatform: { platform: string; gross: number; trips: number }[];
  byCategory: { scope: string; category: string; amount: number }[];
};

const div = (a: number, b: number) => (b > 0 ? Math.round(a / b) : null);

export async function getSummary(userId: string, from: string, to: string): Promise<Summary> {
  const range = { gte: from, lte: to };
  const [earnings, sales, expenses, workDays] = await Promise.all([
    db.earning.findMany({ where: { userId, date: range } }),
    db.sale.findMany({ where: { userId, date: range } }),
    db.expense.findMany({ where: { userId, date: range } }),
    db.workDay.findMany({ where: { userId, date: range } }),
  ]);

  const dayMap = new Map<string, DayRow>(
    eachDay(from, to).map((date) => [
      date,
      { date, rideGross: 0, rideNet: 0, saleGross: 0, saleNet: 0, cogs: 0, carExpenses: 0, storeExpenses: 0, km: 0, hours: 0, trips: 0, profit: 0 },
    ]),
  );
  const platforms = new Map<string, { gross: number; trips: number }>();
  const cats = new Map<string, number>();

  let rideFee = 0, saleFee = 0, trips = 0;
  for (const e of earnings) {
    const d = dayMap.get(e.date)!;
    d.rideGross += e.gross; d.rideNet += e.net; d.trips += e.trips;
    rideFee += e.fee; trips += e.trips;
    const p = platforms.get(e.platform) ?? { gross: 0, trips: 0 };
    p.gross += e.gross; p.trips += e.trips;
    platforms.set(e.platform, p);
  }
  for (const s of sales) {
    const d = dayMap.get(s.date)!;
    d.saleGross += s.gross; d.saleNet += s.net; d.cogs += s.cogs;
    saleFee += s.fee;
  }
  for (const x of expenses) {
    const d = dayMap.get(x.date)!;
    if (x.scope === "STORE") d.storeExpenses += x.amount;
    else d.carExpenses += x.amount;
    const k = `${x.scope}|${x.category}`;
    cats.set(k, (cats.get(k) ?? 0) + x.amount);
  }
  let km = 0, hours = 0;
  for (const w of workDays) {
    const d = dayMap.get(w.date)!;
    d.km += w.km; d.hours += w.hours;
    km += w.km; hours += w.hours;
  }

  const days = [...dayMap.values()];
  for (const d of days) d.profit = d.rideNet + d.saleNet - d.cogs - d.carExpenses - d.storeExpenses;

  const sum = (f: (d: DayRow) => number) => days.reduce((s, d) => s + f(d), 0);
  const rideGross = sum((d) => d.rideGross);
  const rideNet = sum((d) => d.rideNet);
  const saleGross = sum((d) => d.saleGross);
  const saleNet = sum((d) => d.saleNet);
  const cogs = sum((d) => d.cogs);
  const carExpenses = sum((d) => d.carExpenses);
  const storeExpenses = sum((d) => d.storeExpenses);
  const rideProfit = rideNet - carExpenses;
  const storeProfit = saleNet - cogs - storeExpenses;
  const totalProfit = rideProfit + storeProfit;
  const activeDays = days.filter((d) => d.rideGross + d.saleGross + d.carExpenses + d.storeExpenses > 0).length;

  return {
    from, to,
    rideGross, rideFee, rideNet, carExpenses, rideProfit, trips, km, hours,
    workedDays: workDays.filter((w) => w.km > 0 || w.hours > 0).length,
    saleGross, saleFee, saleNet, cogs, storeExpenses, storeProfit,
    totalGross: rideGross + saleGross,
    totalFees: rideFee + saleFee,
    totalProfit,
    netPerKm: km > 0 ? div(rideNet, km) : null,
    profitPerKm: km > 0 ? div(rideProfit, km) : null,
    costPerKm: km > 0 ? div(carExpenses, km) : null,
    netPerHour: hours > 0 ? Math.round(rideNet / hours) : null,
    profitPerHour: hours > 0 ? Math.round(rideProfit / hours) : null,
    netPerTrip: trips > 0 ? div(rideNet, trips) : null,
    avgDailyProfit: activeDays > 0 ? Math.round(totalProfit / activeDays) : null,
    days,
    byPlatform: [...platforms.entries()].map(([platform, v]) => ({ platform, ...v })).sort((a, b) => b.gross - a.gross),
    byCategory: [...cats.entries()]
      .map(([k, amount]) => {
        const [scope, category] = k.split("|");
        return { scope, category, amount };
      })
      .sort((a, b) => b.amount - a.amount),
  };
}
