import { db } from "./db";
import { dueDateFor, addMonths, monthEnd, todayStr } from "./dates";

/** Quantos meses à frente as contas fixas (sem fim) ficam cadastradas. */
const HORIZON_MONTHS = 12;

/**
 * Contas fixas não têm número final de parcelas: mantém sempre os próximos
 * 12 meses cadastrados, criando os que faltarem.
 */
export async function topUpRecurringBills(userId: string) {
  const limit = monthEnd(addMonths(todayStr(), HORIZON_MONTHS));
  const bills = await db.bill.findMany({
    where: { userId, active: true, totalInstallments: null },
    include: { installments: { orderBy: { number: "desc" }, take: 1 } },
  });

  for (const b of bills) {
    let n = b.installments[0]?.number ?? b.startNumber - 1;
    const rows = [];
    while (true) {
      n += 1;
      const due = dueDateFor(b.anchorDate, n - b.startNumber);
      if (due > limit) break;
      rows.push({ billId: b.id, userId, number: n, dueDate: due, amount: b.amount });
    }
    if (rows.length) await db.billInstallment.createMany({ data: rows, skipDuplicates: true });
  }
}

export function installmentLabel(number: number, total: number | null): string {
  return total ? `${number}/${total}` : `nº ${number}`;
}
