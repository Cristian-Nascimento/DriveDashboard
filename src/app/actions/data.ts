"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { isValidDate, todayStr } from "@/lib/dates";
import { parseDecimal, parseMoney } from "@/lib/format";
import { CAR_CATEGORIES, METHODS, PLATFORMS, SALE_METHODS, STORE_CATEGORIES } from "@/lib/constants";
import { computeFee, usesMachine } from "@/lib/fees";

function dateOf(form: FormData): string {
  const d = String(form.get("date") ?? "");
  return isValidDate(d) ? d : todayStr();
}

function back(date: string, anchor?: string, ok = "1"): never {
  revalidatePath("/", "layout");
  redirect(`/dia?date=${date}&ok=${ok}${anchor ? `#${anchor}` : ""}`);
}

async function findMachine(userId: string, method: string, raw: FormDataEntryValue | null) {
  if (!usesMachine(method)) return null;
  const id = String(raw ?? "");
  if (!id) return null;
  return db.machine.findFirst({ where: { id, userId } });
}

/* ---------- Lançar o dia (um único botão salva tudo) ---------- */

const dayEarning = z.object({
  platform: z.string(),
  method: z.string(),
  machineId: z.string().nullable().optional(),
  gross: z.number().int().positive(),
  trips: z.number().int().min(0).max(999).catch(0),
});
const daySale = z.object({
  method: z.string(),
  machineId: z.string().nullable().optional(),
  items: z.array(z.unknown()),
});
const daySaleItem = z.object({
  productId: z.string().nullable().optional(),
  name: z.string().trim().max(80).transform((n) => n || "Item avulso"),
  qty: z.number().int().min(1).max(999),
  unitPrice: z.number().int().positive(),
});
const dayExpense = z.object({
  scope: z.enum(["CAR", "STORE"]),
  category: z.string().trim().min(1).max(80),
  amount: z.number().int().positive(),
  description: z.string().max(200).catch(""),
});
const dayWork = z.object({ km: z.string(), hours: z.string(), note: z.string() });

/** Mantém só as linhas válidas; o que estiver em branco ou inválido é ignorado em silêncio. */
function valid<T>(schema: z.ZodType<T>, list: unknown): T[] {
  return (Array.isArray(list) ? list : []).flatMap((r) => {
    const p = schema.safeParse(r);
    return p.success ? [p.data] : [];
  });
}

export async function saveDay(form: FormData) {
  const user = await requireUser();
  const date = dateOf(form);

  let raw: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(String(form.get("payload") ?? "{}"));
    if (parsed && typeof parsed === "object") raw = parsed;
  } catch {
    /* payload ilegível: trata como vazio */
  }

  const machines = await db.machine.findMany({ where: { userId: user.id, active: true } });
  const machineFor = (method: string, id?: string | null) =>
    usesMachine(method) && id ? (machines.find((m) => m.id === id) ?? null) : null;

  const ops: Prisma.PrismaPromise<unknown>[] = [];
  let saved = 0;

  // fechamento (km, horas, observação): grava se algo foi preenchido; se tudo foi esvaziado, limpa
  const work = dayWork.safeParse(raw.workDay);
  if (work.success) {
    const km = Math.max(0, parseDecimal(work.data.km));
    const hours = Math.max(0, parseDecimal(work.data.hours));
    const note = work.data.note.trim().slice(0, 300);
    if (km > 0 || hours > 0 || note) {
      ops.push(
        db.workDay.upsert({
          where: { userId_date: { userId: user.id, date } },
          update: { km, hours, note },
          create: { userId: user.id, date, km, hours, note },
        }),
      );
      saved++;
    } else {
      ops.push(db.workDay.deleteMany({ where: { userId: user.id, date } }));
    }
  }

  for (const e of valid(dayEarning, raw.earnings)) {
    if (!(e.platform in PLATFORMS) || !(e.method in METHODS)) continue;
    const machine = machineFor(e.method, e.machineId);
    const fee = computeFee(e.gross, e.method, machine);
    ops.push(
      db.earning.create({
        data: {
          userId: user.id,
          date,
          platform: e.platform,
          method: e.method,
          machineId: machine?.id ?? null,
          trips: e.trips,
          gross: e.gross,
          fee,
          net: e.gross - fee,
          note: "",
        },
      }),
    );
    saved++;
  }

  const sales = valid(daySale, raw.sales)
    .filter((s) => (SALE_METHODS as readonly string[]).includes(s.method))
    .map((s) => ({ ...s, items: valid(daySaleItem, s.items).slice(0, 50) }))
    .filter((s) => s.items.length > 0);
  const productIds = sales.flatMap((s) => s.items.map((i) => i.productId)).filter((x): x is string => !!x);
  const products = productIds.length ? await db.product.findMany({ where: { id: { in: productIds }, userId: user.id } }) : [];
  const productById = new Map(products.map((p) => [p.id, p]));

  for (const s of sales) {
    const lines = s.items.map((i) => {
      const p = i.productId ? productById.get(i.productId) : undefined;
      return { productId: p?.id ?? null, name: p?.name ?? i.name, qty: i.qty, unitPrice: i.unitPrice, unitCost: p?.cost ?? 0 };
    });
    const gross = lines.reduce((a, l) => a + l.qty * l.unitPrice, 0);
    const cogs = lines.reduce((a, l) => a + l.qty * l.unitCost, 0);
    const machine = machineFor(s.method, s.machineId);
    const fee = computeFee(gross, s.method, machine);
    ops.push(
      db.sale.create({
        data: {
          userId: user.id,
          date,
          method: s.method,
          machineId: machine?.id ?? null,
          gross,
          fee,
          net: gross - fee,
          cogs,
          note: "",
          items: { create: lines },
        },
      }),
      ...lines
        .filter((l) => l.productId)
        .map((l) => db.product.update({ where: { id: l.productId! }, data: { stock: { decrement: l.qty } } })),
    );
    saved++;
  }

  for (const x of valid(dayExpense, raw.expenses)) {
    const allowed = x.scope === "CAR" ? CAR_CATEGORIES : STORE_CATEGORIES;
    if (!allowed.includes(x.category)) continue;
    ops.push(
      db.expense.create({
        data: { userId: user.id, date, scope: x.scope, category: x.category, description: x.description, amount: x.amount },
      }),
    );
    saved++;
  }

  if (ops.length) await db.$transaction(ops);
  // "s" muda a cada salvamento: faz o formulário recomeçar limpo em vez de repetir as linhas
  revalidatePath("/", "layout");
  redirect(`/dia?date=${date}&ok=${saved > 0 ? "1" : "vazio"}&s=${Date.now()}`);
}

/* ---------- Fechamento do dia ---------- */

export async function saveWorkDay(form: FormData) {
  const user = await requireUser();
  const date = dateOf(form);
  const km = Math.max(0, parseDecimal(form.get("km")));
  const hours = Math.max(0, parseDecimal(form.get("hours")));
  const note = String(form.get("note") ?? "").slice(0, 300);
  await db.workDay.upsert({
    where: { userId_date: { userId: user.id, date } },
    update: { km, hours, note },
    create: { userId: user.id, date, km, hours, note },
  });
  back(date, "fechamento");
}

/* ---------- Ganhos de corridas ---------- */

export async function addEarning(form: FormData) {
  const user = await requireUser();
  const date = dateOf(form);
  const platform = String(form.get("platform"));
  const method = String(form.get("method"));
  if (!(platform in PLATFORMS) || !(method in METHODS)) back(date, "ganhos");

  const gross = parseMoney(form.get("gross"));
  if (gross <= 0) back(date, "ganhos");

  const machine = await findMachine(user.id, method, form.get("machineId"));
  const fee = computeFee(gross, method, machine);

  await db.earning.create({
    data: {
      userId: user.id,
      date,
      platform,
      method,
      machineId: machine?.id ?? null,
      trips: Math.max(0, Math.round(parseDecimal(form.get("trips")))),
      gross,
      fee,
      net: gross - fee,
      note: String(form.get("note") ?? "").slice(0, 200),
    },
  });
  back(date, "ganhos");
}

export async function deleteEarning(form: FormData) {
  const user = await requireUser();
  await db.earning.deleteMany({ where: { id: String(form.get("id")), userId: user.id } });
  back(dateOf(form), "ganhos");
}

/* ---------- Despesas ---------- */

export async function addExpense(form: FormData) {
  const user = await requireUser();
  const date = dateOf(form);
  const scope = form.get("scope") === "STORE" ? "STORE" : "CAR";
  const category = String(form.get("category") ?? "");
  const allowed = scope === "CAR" ? CAR_CATEGORIES : STORE_CATEGORIES;
  const amount = parseMoney(form.get("amount"));
  if (amount <= 0 || !allowed.includes(category)) back(date, "despesas");

  await db.expense.create({
    data: {
      userId: user.id,
      date,
      scope,
      category,
      description: String(form.get("description") ?? "").slice(0, 200),
      amount,
    },
  });
  back(date, "despesas");
}

export async function deleteExpense(form: FormData) {
  const user = await requireUser();
  const id = String(form.get("id"));
  // se a despesa veio do pagamento de uma parcela, a parcela volta a ficar pendente
  await db.$transaction([
    db.billInstallment.updateMany({
      where: { expenseId: id, userId: user.id },
      data: { paidDate: null, paidAmount: null, expenseId: null },
    }),
    db.expense.deleteMany({ where: { id, userId: user.id } }),
  ]);
  back(dateOf(form), "despesas");
}

/* ---------- Edição de lançamentos ---------- */

export async function updateEarning(form: FormData) {
  const user = await requireUser();
  const id = String(form.get("id"));
  const date = dateOf(form);
  const platform = String(form.get("platform"));
  const method = String(form.get("method"));
  const gross = parseMoney(form.get("gross"));
  if (!(platform in PLATFORMS) || !(method in METHODS) || gross <= 0) back(date, "ganhos");

  const machine = await findMachine(user.id, method, form.get("machineId"));
  const fee = computeFee(gross, method, machine);
  await db.earning.updateMany({
    where: { id, userId: user.id },
    data: {
      date,
      platform,
      method,
      machineId: machine?.id ?? null,
      trips: Math.max(0, Math.round(parseDecimal(form.get("trips")))),
      gross,
      fee,
      net: gross - fee,
      note: String(form.get("note") ?? "").slice(0, 200),
    },
  });
  back(date, "ganhos");
}

export async function updateExpense(form: FormData) {
  const user = await requireUser();
  const id = String(form.get("id"));
  const date = dateOf(form);
  const scope = form.get("scope") === "STORE" ? "STORE" : "CAR";
  const category = String(form.get("category") ?? "").trim().slice(0, 80);
  const amount = parseMoney(form.get("amount"));
  if (amount <= 0 || !category) back(date, "despesas");

  await db.expense.updateMany({
    where: { id, userId: user.id },
    data: { date, scope, category, amount, description: String(form.get("description") ?? "").slice(0, 200) },
  });
  back(date, "despesas");
}

export async function updateSale(form: FormData) {
  const user = await requireUser();
  const id = String(form.get("id"));
  const date = dateOf(form);
  const method = String(form.get("method"));
  if (!(SALE_METHODS as readonly string[]).includes(method)) back(date, "vendas");

  let items;
  try {
    items = itemsSchema.parse(JSON.parse(String(form.get("items") ?? "[]")));
  } catch {
    back(date, "vendas");
  }

  const old = await db.sale.findFirst({ where: { id, userId: user.id }, include: { items: true } });
  if (!old) back(date, "vendas");

  const ids = items.map((i) => i.productId).filter((x): x is string => !!x);
  const products = await db.product.findMany({ where: { id: { in: ids }, userId: user.id } });
  const byId = new Map(products.map((p) => [p.id, p]));
  const oldCost = new Map(old!.items.filter((i) => i.productId).map((i) => [i.productId!, i.unitCost]));

  const lines = items.map((i) => {
    const p = i.productId ? byId.get(i.productId) : undefined;
    // mantém o custo da época se o produto já estava na venda
    const unitCost = p ? (oldCost.get(p.id) ?? p.cost) : 0;
    return { productId: p?.id ?? null, name: p?.name ?? i.name, qty: i.qty, unitPrice: i.unitPrice, unitCost };
  });
  const gross = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const cogs = lines.reduce((s, l) => s + l.qty * l.unitCost, 0);
  if (gross <= 0) back(date, "vendas");

  const machine = await findMachine(user.id, method, form.get("machineId"));
  const fee = computeFee(gross, method, machine);

  await db.$transaction([
    // devolve o estoque da versão antiga e baixa o da nova
    ...old!.items
      .filter((i) => i.productId)
      .map((i) => db.product.updateMany({ where: { id: i.productId!, userId: user.id }, data: { stock: { increment: i.qty } } })),
    db.saleItem.deleteMany({ where: { saleId: id } }),
    db.sale.update({
      where: { id },
      data: {
        date,
        method,
        machineId: machine?.id ?? null,
        gross,
        fee,
        net: gross - fee,
        cogs,
        note: String(form.get("note") ?? "").slice(0, 200),
        items: { create: lines },
      },
    }),
    ...lines
      .filter((l) => l.productId)
      .map((l) => db.product.update({ where: { id: l.productId! }, data: { stock: { decrement: l.qty } } })),
  ]);
  back(date, "vendas");
}

/* ---------- Vendas da vendinha ---------- */

const itemsSchema = z
  .array(
    z.object({
      productId: z.string().nullable().optional(),
      name: z.string().trim().min(1).max(80),
      qty: z.number().int().min(1).max(999),
      unitPrice: z.number().int().min(0),
    }),
  )
  .min(1)
  .max(50);

export async function addSale(form: FormData) {
  const user = await requireUser();
  const date = dateOf(form);
  const method = String(form.get("method"));
  if (!(SALE_METHODS as readonly string[]).includes(method)) back(date, "vendas");

  let items;
  try {
    items = itemsSchema.parse(JSON.parse(String(form.get("items") ?? "[]")));
  } catch {
    back(date, "vendas");
  }

  const ids = items.map((i) => i.productId).filter((x): x is string => !!x);
  const products = await db.product.findMany({ where: { id: { in: ids }, userId: user.id } });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lines = items.map((i) => {
    const p = i.productId ? byId.get(i.productId) : undefined;
    return { productId: p?.id ?? null, name: p?.name ?? i.name, qty: i.qty, unitPrice: i.unitPrice, unitCost: p?.cost ?? 0 };
  });

  const gross = lines.reduce((s, l) => s + l.qty * l.unitPrice, 0);
  const cogs = lines.reduce((s, l) => s + l.qty * l.unitCost, 0);
  if (gross <= 0) back(date, "vendas");

  const machine = await findMachine(user.id, method, form.get("machineId"));
  const fee = computeFee(gross, method, machine);

  await db.$transaction([
    db.sale.create({
      data: {
        userId: user.id,
        date,
        method,
        machineId: machine?.id ?? null,
        gross,
        fee,
        net: gross - fee,
        cogs,
        note: String(form.get("note") ?? "").slice(0, 200),
        items: { create: lines },
      },
    }),
    ...lines
      .filter((l) => l.productId)
      .map((l) => db.product.update({ where: { id: l.productId! }, data: { stock: { decrement: l.qty } } })),
  ]);
  back(date, "vendas");
}

export async function deleteSale(form: FormData) {
  const user = await requireUser();
  const id = String(form.get("id"));
  const sale = await db.sale.findFirst({ where: { id, userId: user.id }, include: { items: true } });
  if (sale) {
    await db.$transaction([
      ...sale.items
        .filter((i) => i.productId)
        .map((i) => db.product.updateMany({ where: { id: i.productId!, userId: user.id }, data: { stock: { increment: i.qty } } })),
      db.sale.delete({ where: { id } }),
    ]);
  }
  back(dateOf(form), "vendas");
}

/* ---------- Produtos ---------- */

export async function saveProduct(form: FormData) {
  const user = await requireUser();
  const id = String(form.get("id") ?? "");
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  if (!name) redirect("/vendinha");

  const data = {
    name,
    category: String(form.get("category") ?? "").trim().slice(0, 40),
    cost: parseMoney(form.get("cost")),
    price: parseMoney(form.get("price")),
  };

  if (id) {
    await db.product.updateMany({ where: { id, userId: user.id }, data });
  } else {
    await db.product.create({
      data: { ...data, userId: user.id, stock: Math.max(0, Math.round(parseDecimal(form.get("stock")))) },
    });
  }
  revalidatePath("/", "layout");
  redirect("/vendinha");
}

export async function restockProduct(form: FormData) {
  const user = await requireUser();
  const qty = Math.round(parseDecimal(form.get("qty")));
  const id = String(form.get("id"));
  if (qty > 0) {
    // custo opcional: se informado, atualiza o custo unitário do produto
    const cost = parseMoney(form.get("cost"));
    await db.product.updateMany({
      where: { id, userId: user.id },
      data: { stock: { increment: qty }, ...(cost > 0 ? { cost } : {}) },
    });
  }
  revalidatePath("/", "layout");
  redirect("/vendinha");
}

export async function archiveProduct(form: FormData) {
  const user = await requireUser();
  await db.product.updateMany({ where: { id: String(form.get("id")), userId: user.id }, data: { active: false } });
  revalidatePath("/", "layout");
  redirect("/vendinha");
}

/* ---------- Maquininhas ---------- */

export async function saveMachine(form: FormData) {
  const user = await requireUser();
  const id = String(form.get("id") ?? "");
  const name = String(form.get("name") ?? "").trim().slice(0, 60);
  if (!name) redirect("/maquininhas");

  const rate = (k: string) => Math.min(30, Math.max(0, parseDecimal(form.get(k))));
  const data = {
    name,
    debitFee: rate("debitFee"),
    creditFee: rate("creditFee"),
    creditInstFee: rate("creditInstFee"),
    pixFee: rate("pixFee"),
  };

  if (id) await db.machine.updateMany({ where: { id, userId: user.id }, data });
  else await db.machine.create({ data: { ...data, userId: user.id } });
  revalidatePath("/", "layout");
  redirect("/maquininhas?salvo=1");
}

export async function archiveMachine(form: FormData) {
  const user = await requireUser();
  await db.machine.updateMany({ where: { id: String(form.get("id")), userId: user.id }, data: { active: false } });
  revalidatePath("/", "layout");
  redirect("/maquininhas");
}
