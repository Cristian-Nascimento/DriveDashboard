import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { centsToInput } from "@/lib/format";
import { CAR_CATEGORIES, PLATFORMS, STORE_CATEGORIES } from "@/lib/constants";
import { updateEarning, updateExpense } from "@/app/actions/data";
import { PageHeader, Section } from "@/components/ui";
import { PayFields } from "@/components/PayFields";
import { SaleForm } from "@/components/SaleForm";

export const metadata = { title: "Editar lançamento · Pop Dashboard" };

export default async function EditarPage({ params }: { params: Promise<{ tipo: string; id: string }> }) {
  const user = await requireUser();
  const { tipo, id } = await params;
  const machines = await db.machine.findMany({ where: { userId: user.id, active: true }, orderBy: { name: "asc" } });
  const machineOpts = machines.map((m) => ({ id: m.id, name: m.name }));

  let date = "";
  let body: React.ReactNode;

  if (tipo === "ganho") {
    const e = await db.earning.findFirst({ where: { id, userId: user.id } });
    if (!e) notFound();
    date = e.date;
    body = (
      <form action={updateEarning} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <input type="hidden" name="id" value={e.id} />
        <div>
          <label className="label">Data</label>
          <input type="date" name="date" className="input" defaultValue={e.date} required />
        </div>
        <div>
          <label className="label">Plataforma</label>
          <select name="platform" className="input" defaultValue={e.platform}>
            {Object.entries(PLATFORMS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <PayFields
          methods={["APP", "CASH", "PIX", "DEBIT", "CREDIT", "CREDIT_INST"]}
          machines={machineOpts}
          defaultMethod={e.method as "APP"}
          defaultMachineId={e.machineId}
        />
        <div>
          <label className="label">Valor recebido (R$)</label>
          <input name="gross" className="input" inputMode="decimal" defaultValue={centsToInput(e.gross)} required />
        </div>
        <div>
          <label className="label">Nº de corridas</label>
          <input name="trips" className="input" inputMode="numeric" defaultValue={e.trips || ""} />
        </div>
        <div className="sm:col-span-2 lg:col-span-3">
          <button className="btn w-full sm:w-auto">Salvar alterações</button>
        </div>
      </form>
    );
  } else if (tipo === "despesa") {
    const x = await db.expense.findFirst({ where: { id, userId: user.id } });
    if (!x) notFound();
    date = x.date;
    const cats = Array.from(new Set([...CAR_CATEGORIES, ...STORE_CATEGORIES, x.category]));
    body = (
      <form action={updateExpense} className="grid gap-3 sm:grid-cols-2">
        <input type="hidden" name="id" value={x.id} />
        <div>
          <label className="label">Data</label>
          <input type="date" name="date" className="input" defaultValue={x.date} required />
        </div>
        <div>
          <label className="label">Tipo</label>
          <select name="scope" className="input" defaultValue={x.scope}>
            <option value="CAR">Carro / corridas</option>
            <option value="STORE">Vendinha</option>
          </select>
        </div>
        <div>
          <label className="label">Categoria</label>
          <select name="category" className="input" defaultValue={x.category}>
            {cats.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Valor (R$)</label>
          <input name="amount" className="input" inputMode="decimal" defaultValue={centsToInput(x.amount)} required />
        </div>
        <div className="sm:col-span-2">
          <label className="label">Descrição</label>
          <input name="description" className="input" maxLength={200} defaultValue={x.description} />
        </div>
        <div className="sm:col-span-2">
          <button className="btn w-full sm:w-auto">Salvar alterações</button>
        </div>
      </form>
    );
  } else if (tipo === "venda") {
    const s = await db.sale.findFirst({ where: { id, userId: user.id }, include: { items: true } });
    if (!s) notFound();
    date = s.date;
    const products = await db.product.findMany({ where: { userId: user.id, active: true }, orderBy: { name: "asc" } });
    body = (
      <SaleForm
        date={s.date}
        products={products.map((p) => ({ id: p.id, name: p.name, price: p.price, stock: p.stock }))}
        machines={machineOpts}
        sale={{
          id: s.id,
          method: s.method,
          machineId: s.machineId,
          items: s.items.map((i) => ({ productId: i.productId, name: i.name, qty: i.qty, unitPrice: i.unitPrice })),
        }}
      />
    );
  } else {
    notFound();
  }

  return (
    <>
      <PageHeader title="Editar lançamento">
        <Link href={`/dia?date=${date}`} className="btn-ghost">Cancelar</Link>
      </PageHeader>
      <Section title={tipo === "ganho" ? "Ganho de corridas" : tipo === "venda" ? "Venda da vendinha" : "Despesa"}>{body}</Section>
    </>
  );
}
