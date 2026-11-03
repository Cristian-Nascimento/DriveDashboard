export function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function num(n: number, digits = 1): string {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

/** "12,50" | "12.50" | "1.234,56" -> centavos */
export function parseMoney(input: FormDataEntryValue | null | undefined): number {
  if (input == null) return 0;
  let s = String(input).trim().replace(/[R$\s]/g, "");
  if (!s) return 0;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const v = Number(s);
  return Number.isFinite(v) ? Math.round(v * 100) : 0;
}

export function parseDecimal(input: FormDataEntryValue | null | undefined): number {
  if (input == null) return 0;
  const s = String(input).trim().replace(",", ".");
  const v = Number(s);
  return Number.isFinite(v) ? v : 0;
}

export function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function pct(part: number, total: number): string {
  return total > 0 ? `${num((part / total) * 100, 0)}%` : "–";
}
