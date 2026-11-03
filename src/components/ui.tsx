import Link from "next/link";
import { brl } from "@/lib/format";

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted first-letter:uppercase">{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "pos" | "neg";
}) {
  return (
    <div className="card !p-4">
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className={`mt-1 text-xl font-semibold tracking-tight sm:text-2xl ${tone === "pos" ? "text-pos" : tone === "neg" ? "text-neg" : ""}`}>
        {value}
      </p>
      {hint && <p className="mt-0.5 text-xs text-muted">{hint}</p>}
    </div>
  );
}

export function Money({ cents, signed }: { cents: number; signed?: boolean }) {
  const cls = signed ? (cents > 0 ? "text-pos" : cents < 0 ? "text-neg" : "") : "";
  return <span className={cls}>{brl(cents)}</span>;
}

export function Section({ id, title, children, aside }: { id?: string; title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section id={id} className="card mb-4 scroll-mt-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-xl bg-brand-soft/60 px-3 py-4 text-center text-sm text-muted">{children}</p>;
}

export function Tabs({ items }: { items: { href: string; label: string; active: boolean }[] }) {
  return (
    <div className="flex w-full rounded-xl border border-line bg-white p-1 md:inline-flex md:w-auto">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={`flex-1 rounded-lg px-3.5 py-1.5 text-center text-sm font-medium transition md:flex-none ${i.active ? "bg-brand text-white" : "text-muted hover:text-ink"}`}
        >
          {i.label}
        </Link>
      ))}
    </div>
  );
}
