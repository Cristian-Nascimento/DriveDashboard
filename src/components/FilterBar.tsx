"use client";

import { useState } from "react";

/**
 * No celular mostra só um botão "Filtros" (com o filtro atual ao lado); os controles
 * aparecem ao tocar nele. Em telas médias para cima ficam sempre visíveis, em linha.
 */
export function FilterBar({ summary, children }: { summary: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full md:w-auto">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="filtros-painel"
        className="btn-ghost w-full !justify-between !px-3.5 md:hidden"
      >
        <span className="flex min-w-0 items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M4 6h16M7 12h10M10 18h4" />
          </svg>
          <span>Filtros</span>
          <span className="shrink-0 font-normal text-muted">·</span>
          <span className="truncate font-normal text-muted first-letter:uppercase">{summary}</span>
        </span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 text-muted transition ${open ? "rotate-180" : ""}`} aria-hidden>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <div
        id="filtros-painel"
        className={`${open ? "mt-2 flex" : "hidden"} flex-col gap-2 rounded-2xl border border-line bg-surface p-3 md:mt-0 md:flex md:flex-row md:flex-wrap md:items-center md:rounded-none md:border-0 md:bg-transparent md:p-0`}
      >
        {children}
      </div>
    </div>
  );
}
