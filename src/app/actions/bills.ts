"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { dueDateFor, isValidDate, todayStr } from "@/lib/dates";
import { parseDecimal, parseMoney } from "@/lib/format";
import { BILL_TYPES } from "@/lib/constants";
import { installmentLabel, topUpRecurringBills } from "@/lib/bills";

function done(anchor?: string): never {
  revalidatePath("/", "layout");
  redirect(`/contas?ok=1${anchor ? `#${anchor}` : ""}`);
}

/**
 * Cadastra uma conta mensal e TODAS as parcelas dela (atual + futuras).
 * - parcelada: parcela atual `current`, faltam `remaining` -> total = current + remaining
 * - fixa (sem fim): cadastra os próximos 12 meses e renova sozinha
 */
export async function createBill(form: FormData) {
  const user = await requireUser();
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  const category = String(form.get("category") ?? "");
  const scope = form.get("scope") === "STORE" ? "STORE" : "CAR";
  const amount = parseMoney(form.get("amount"));
  const due = String(form.get("dueDate") ?? "");
  const recurring = form.get("mode") === "FIXA";
  if (!name || amount <= 0 || !BILL_TYPES.includes(category) || !isValidDate(due)) redirect("/contas?erro=1");

  const current = Math.max(1, Math.round(parseDecimal(form.get("current")) || 1));
  const remaining = Math.min(600, Math.max(0, Math.round(parseDecimal(form.get("remaining")))));
  const total = recurring ? null : current + remaining;

  const bill = await db.bill.create({
    data: { userId: user.id, name, category, scope, amount, totalInstallments: total, startNumber: recurring ? 1 : current, anchorDate: due },
  });

  if (!recurring) {
    await db.billInstallment.createMany({
      data: Array.from({ length: remaining + 1 }, (_, i) => ({
        billId: bill.id,
        userId: user.id,
        number: current + i,
        dueDate: dueDateFor(due, i),
        amount,
      })),
    });
  } else {
    await topUpRecurringBills(user.id);
  }
  done("proximas");
}

/** Marca a parcela como paga e lança a despesa correspondente no dia do pagamento. */
export async function payInstallment(form: FormData) {
  const user = await requireUser();
  const id = String(form.get("id"));
  const inst = await db.billInstallment.findFirst({ where: { id, userId: user.id }, include: { bill: true } });
  if (!inst || inst.paidDate) done();

  const paidDate = isValidDate(String(form.get("paidDate"))) ? String(form.get("paidDate")) : todayStr();
  const paidAmount = parseMoney(form.get("paidAmount")) || inst.amount;

  await db.$transaction(async (tx) => {
    const expense = await tx.expense.create({
      data: {
        userId: user.id,
        date: paidDate,
        scope: inst.bill.scope,
        category: inst.bill.category,
        description: `${inst.bill.name} (${installmentLabel(inst.number, inst.bill.totalInstallments)})`,
        amount: paidAmount,
      },
    });
    await tx.billInstallment.update({ where: { id }, data: { paidDate, paidAmount, expenseId: expense.id } });
  });
  done("proximas");
}

export async function unpayInstallment(form: FormData) {
  const user = await requireUser();
  const inst = await db.billInstallment.findFirst({ where: { id: String(form.get("id")), userId: user.id } });
  if (inst?.paidDate) {
    await db.$transaction([
      db.billInstallment.update({ where: { id: inst.id }, data: { paidDate: null, paidAmount: null, expenseId: null } }),
      ...(inst.expenseId ? [db.expense.deleteMany({ where: { id: inst.expenseId, userId: user.id } })] : []),
    ]);
  }
  done("pagas");
}

/** Edita valor e vencimento de uma única parcela ainda não paga. */
export async function updateInstallment(form: FormData) {
  const user = await requireUser();
  const due = String(form.get("dueDate") ?? "");
  const amount = parseMoney(form.get("amount"));
  if (isValidDate(due) && amount > 0) {
    await db.billInstallment.updateMany({
      where: { id: String(form.get("id")), userId: user.id, paidDate: null },
      data: { dueDate: due, amount },
    });
  }
  done("contas");
}

/** Edita a conta; o novo valor vale para as parcelas ainda não pagas. */
export async function updateBill(form: FormData) {
  const user = await requireUser();
  const id = String(form.get("id"));
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  const category = String(form.get("category") ?? "");
  const scope = form.get("scope") === "STORE" ? "STORE" : "CAR";
  const amount = parseMoney(form.get("amount"));
  if (!name || amount <= 0 || !BILL_TYPES.includes(category)) redirect("/contas?erro=1");

  const bill = await db.bill.findFirst({ where: { id, userId: user.id } });
  if (bill) {
    await db.$transaction([
      db.bill.update({ where: { id }, data: { name, category, scope, amount } }),
      db.billInstallment.updateMany({ where: { billId: id, paidDate: null }, data: { amount } }),
    ]);
  }
  done("contas");
}

/** Remove a conta e as parcelas ainda não pagas. O que já foi pago continua nas despesas. */
export async function deleteBill(form: FormData) {
  const user = await requireUser();
  await db.bill.deleteMany({ where: { id: String(form.get("id")), userId: user.id } });
  done("contas");
}
