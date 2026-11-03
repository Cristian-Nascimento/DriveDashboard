"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

/**
 * Escolha da data do lançamento. Trocar a data recarrega a página daquele dia
 * (fechamento e lançamentos existentes), para nunca gravar km/horas de um dia em outro.
 */
export function DayDateNav({ date, prev, next, isToday }: { date: string; prev: string; next: string; isToday: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const go = (d: string) => start(() => router.push(`/dia?date=${d}`));

  return (
    <div className="card mb-4 !p-3 sm:!p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <label htmlFor="data-lancamento" className="text-xs font-medium text-muted">Data do lançamento</label>
        {!isToday && (
          <Link href="/dia" className="text-xs font-medium text-brand underline-offset-2 hover:underline">Voltar para hoje</Link>
        )}
      </div>
      <div className={`flex items-center gap-2 transition ${pending ? "opacity-60" : ""}`}>
        <Link href={`/dia?date=${prev}`} className="btn-ghost !px-3.5" aria-label="Dia anterior">‹</Link>
        <input
          id="data-lancamento"
          type="date"
          value={date}
          onChange={(e) => e.target.value && go(e.target.value)}
          className="input min-w-0 flex-1 text-center sm:max-w-xs"
        />
        <Link href={`/dia?date=${next}`} className="btn-ghost !px-3.5" aria-label="Próximo dia">›</Link>
      </div>
      <p className="mt-2 text-xs text-muted">
        {isToday ? "Lançando no dia de hoje." : "Lançando em outra data. Tudo o que você salvar abaixo vai para este dia."}
      </p>
    </div>
  );
}
