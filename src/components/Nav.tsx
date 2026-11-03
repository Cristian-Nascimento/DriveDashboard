"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/app/actions/auth";
import { ThemeToggle } from "./ThemeToggle";

const ITEMS = [
  { href: "/", label: "Painel", icon: "M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z" },
  { href: "/dia", label: "Lançar", icon: "M12 5v14M5 12h14" },
  { href: "/contas", label: "Contas", icon: "M6 3h12v18l-3-2-3 2-3-2-3 2V3zM9 8h6M9 12h6" },
  { href: "/vendinha", label: "Vendinha", icon: "M3 9l1-5h16l1 5M4 9v11h16V9M9 20v-6h6v6" },
  { href: "/relatorios", label: "Relatórios", icon: "M5 21V10M12 21V4M19 21v-7" },
  { href: "/ajustes", label: "Ajustes", icon: "M4 6h16M4 12h16M4 18h16" },
];

function Icon({ d }: { d: string }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

export function Nav({ userName }: { userName: string }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <>
      {/* Celular: barra de topo com o botão de tema */}
      <header className="flex items-center justify-between px-4 pt-3 md:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-semibold text-on-brand">P</div>
          <span className="text-sm font-semibold tracking-tight">Pop Dashboard</span>
        </div>
        <ThemeToggle />
      </header>

      {/* Desktop / tablet: barra lateral */}
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col border-r border-line bg-surface p-4 md:flex">
        <div className="mb-6 flex items-center gap-3 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-sm font-semibold text-on-brand">P</div>
          <span className="font-semibold tracking-tight">Pop Dashboard</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {ITEMS.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active(i.href) ? "bg-brand text-on-brand" : "text-muted hover:bg-brand-soft hover:text-ink"
              }`}
            >
              <Icon d={i.icon} />
              {i.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-line pt-3">
          <ThemeToggle variant="row" />
          <p className="mt-2 truncate px-2 text-sm font-medium">{userName}</p>
          <form action={logout}>
            <button className="mt-1 w-full cursor-pointer rounded-lg px-2 py-1.5 text-left text-sm text-muted hover:bg-brand-soft">
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* Celular: barra inferior */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-6 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        {ITEMS.map((i) => (
          <Link
            key={i.href}
            href={i.href}
            className={`flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium ${
              active(i.href) ? "text-brand" : "text-muted"
            }`}
          >
            <span className={`rounded-full px-3 py-1 ${active(i.href) ? "bg-brand-soft" : ""}`}>
              <Icon d={i.icon} />
            </span>
            {i.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
