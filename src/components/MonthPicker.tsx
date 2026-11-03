"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const FULL = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

type Props = {
  /** Mês selecionado, "YYYY-MM". */
  value: string;
  /** Mês de hoje, "YYYY-MM" (destaca o atalho "Este mês"). */
  current: string;
  basePath: string;
  /** Nome do parâmetro de URL que recebe a escolha. */
  param: string;
  /** Texto colado ao "YYYY-MM" no parâmetro (ex.: "-01" quando a página espera uma data). */
  suffix?: string;
  /** Outros parâmetros de URL a manter. */
  extra?: Record<string, string>;
  /** Classes do contêiner (padrão: largura total no celular, automática de md para cima). */
  className?: string;
};

export function MonthPicker({ value, current, basePath, param, suffix = "", extra = {}, className = "w-full md:w-auto" }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(() => Number(value.slice(0, 4)));
  const box = useRef<HTMLDivElement>(null);
  // largura e deslocamento do painel, calculados ao abrir para nunca passar da tela
  const [pos, setPos] = useState({ width: 280, left: 0 });

  const selYear = Number(value.slice(0, 4));
  const selMonth = Number(value.slice(5, 7)) - 1;
  const curYear = Number(current.slice(0, 4));
  const curMonth = Number(current.slice(5, 7)) - 1;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function go(y: number, m: number) {
    const ym = `${y}-${String(m + 1).padStart(2, "0")}`;
    const qs = new URLSearchParams({ ...extra, [param]: ym + suffix });
    setOpen(false);
    router.push(`${basePath}?${qs.toString()}`);
  }

  return (
    <div ref={box} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => {
          setYear(selYear);
          const r = box.current?.getBoundingClientRect();
          if (r) {
            const width = Math.min(280, window.innerWidth - 32);
            const left = Math.min(Math.max(r.left, 16), window.innerWidth - 16 - width);
            setPos({ width, left: left - r.left });
          }
          setOpen((o) => !o);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="btn-ghost w-full !gap-2 !px-3.5 md:w-auto"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3.5" y="5" width="17" height="15" rx="3" />
          <path d="M3.5 10h17M8 3v4M16 3v4" />
        </svg>
        <span className="first-letter:uppercase">{FULL[selMonth]}</span>
        <span className="text-muted">{selYear}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`text-muted transition ${open ? "rotate-180" : ""}`} aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div role="dialog" aria-label="Escolher mês e ano" style={{ width: pos.width, left: pos.left }} className="absolute z-30 mt-2 rounded-2xl border border-line bg-surface p-3 shadow-[0_12px_32px_rgba(20,20,20,0.12)]">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => setYear((y) => y - 1)} aria-label="Ano anterior" className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-ink">‹</button>
            <span className="text-sm font-semibold tabular-nums">{year}</span>
            <button type="button" onClick={() => setYear((y) => y + 1)} aria-label="Próximo ano" className="grid h-8 w-8 cursor-pointer place-items-center rounded-lg text-muted transition hover:bg-brand-soft hover:text-ink">›</button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            {SHORT.map((label, m) => {
              const active = year === selYear && m === selMonth;
              const isCurrent = year === curYear && m === curMonth;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => go(year, m)}
                  aria-pressed={active}
                  className={`cursor-pointer rounded-xl px-2 py-2 text-sm font-medium transition ${
                    active ? "bg-brand text-white" : isCurrent ? "bg-brand-soft text-ink ring-1 ring-inset ring-line hover:bg-line/60" : "text-ink hover:bg-brand-soft"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => go(curYear, curMonth)}
            className="mt-2 w-full cursor-pointer rounded-xl py-2 text-xs font-medium text-muted transition hover:bg-brand-soft hover:text-ink"
          >
            Ir para o mês atual
          </button>
        </div>
      )}
    </div>
  );
}
