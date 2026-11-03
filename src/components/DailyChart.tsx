"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export type ChartPoint = { label: string; receita: number; despesas: number; lucro: number };

const brl0 = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function DailyChart({ data }: { data: ChartPoint[] }) {
  return (
    <div className="h-64 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-line)" vertical={false} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: "var(--color-muted)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis tick={{ fontSize: 11, fill: "var(--color-muted)" }} tickLine={false} axisLine={false} width={56} tickFormatter={(v) => `${v}`} />
          <Tooltip
            formatter={(v, name) => [brl0(Number(v)), String(name)]}
            contentStyle={{ borderRadius: 12, border: "1px solid var(--color-line)", background: "var(--color-surface)", color: "var(--color-ink)", fontSize: 12 }}
            cursor={{ fill: "var(--color-brand-soft)" }}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="receita" name="Receita" fill="var(--color-brand)" radius={[4, 4, 0, 0]} />
          <Bar dataKey="despesas" name="Despesas" fill="#c9a98a" radius={[4, 4, 0, 0]} />
          <Bar dataKey="lucro" name="Lucro" fill="var(--color-pos)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
