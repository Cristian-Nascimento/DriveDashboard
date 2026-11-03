// Datas são strings "YYYY-MM-DD" no fuso local de quem usa.

export function toStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Data de hoje no fuso do Brasil (o servidor pode estar em UTC). */
export function todayStr(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return parts; // en-CA => YYYY-MM-DD
}

export function isValidDate(s: string | undefined | null): s is string {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(fromStr(s).getTime());
}

export function addDays(s: string, n: number): string {
  const d = fromStr(s);
  d.setDate(d.getDate() + n);
  return toStr(d);
}

/** Segunda-feira da semana de `s` */
export function weekStart(s: string): string {
  const d = fromStr(s);
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return toStr(d);
}

export function monthStart(s: string): string {
  return s.slice(0, 7) + "-01";
}

export function monthEnd(s: string): string {
  const d = fromStr(monthStart(s));
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return toStr(d);
}

export function addMonths(s: string, n: number): string {
  const d = fromStr(monthStart(s));
  d.setMonth(d.getMonth() + n);
  return toStr(d);
}

/** Vencimento `k` meses depois de `first`, mantendo o dia (ajusta para o fim de meses curtos). */
export function dueDateFor(first: string, k: number): string {
  const [y, m, d] = first.split("-").map(Number);
  const t = new Date(y, m - 1 + k, 1);
  const last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate();
  t.setDate(Math.min(d, last));
  return toStr(t);
}

export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  for (let cur = from; cur <= to; cur = addDays(cur, 1)) out.push(cur);
  return out;
}

const WEEKDAYS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

export function labelDate(s: string, withWeekday = true): string {
  const d = fromStr(s);
  const base = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return withWeekday ? `${WEEKDAYS[d.getDay()]}, ${base}` : base;
}

export function labelMonth(s: string): string {
  return fromStr(s).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
}
