import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { brl, centsToInput, pct } from "@/lib/format";
import { archiveProduct, restockProduct, saveProduct } from "@/app/actions/data";
import { Empty, PageHeader, Section } from "@/components/ui";

export const metadata = { title: "Vendinha · Pop Dashboard" };

export default async function VendinhaPage() {
  const user = await requireUser();
  const products = await db.product.findMany({ where: { userId: user.id, active: true }, orderBy: { name: "asc" } });
  const stockValue = products.reduce((s, p) => s + Math.max(0, p.stock) * p.cost, 0);
  const stockUnits = products.reduce((s, p) => s + Math.max(0, p.stock), 0);

  return (
    <>
      <PageHeader title="Vendinha" subtitle={`${products.length} produtos · ${stockUnits} un. em estoque · custo parado ${brl(stockValue)}`} />

      <Section title="Novo produto">
        <form action={saveProduct} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <label className="label">Nome</label>
            <input name="name" className="input" required maxLength={80} placeholder="Ex.: Trufa de maracujá" />
          </div>
          <div>
            <label className="label">Categoria</label>
            <input name="category" className="input" maxLength={40} placeholder="Trufas, perfumes…" />
          </div>
          <div>
            <label className="label">Custo un. (R$)</label>
            <input name="cost" className="input" inputMode="decimal" placeholder="0,00" />
          </div>
          <div>
            <label className="label">Preço venda (R$)</label>
            <input name="price" className="input" inputMode="decimal" placeholder="0,00" />
          </div>
          <div>
            <label className="label">Estoque inicial</label>
            <input name="stock" className="input" inputMode="numeric" placeholder="0" />
          </div>
          <div className="flex items-end">
            <button className="btn w-full">Cadastrar</button>
          </div>
        </form>
      </Section>

      <Section title="Produtos e estoque">
        {products.length === 0 ? (
          <Empty>Nenhum produto cadastrado ainda.</Empty>
        ) : (
          <ul className="divide-y divide-line">
            {products.map((p) => {
              const margin = p.price - p.cost;
              return (
                <li key={p.id} className="py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-muted">
                        {p.category || "Sem categoria"} · custo {brl(p.cost)} · venda {brl(p.price)} · margem {brl(margin)} ({pct(margin, p.price)})
                      </p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${p.stock <= 0 ? "bg-neg/10 text-neg" : p.stock <= 3 ? "bg-warn/10 text-warn" : "bg-brand-soft text-brand"}`}>
                      {p.stock} em estoque
                    </span>
                  </div>

                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm font-medium text-brand">Editar / repor estoque</summary>
                    <div className="mt-3 grid gap-4 lg:grid-cols-2">
                      <form action={saveProduct} className="grid grid-cols-2 gap-2 rounded-xl bg-brand-soft/50 p-3">
                        <input type="hidden" name="id" value={p.id} />
                        <input name="name" className="input col-span-2" defaultValue={p.name} required aria-label="Nome" />
                        <input name="category" className="input col-span-2" defaultValue={p.category} placeholder="Categoria" aria-label="Categoria" />
                        <input name="cost" className="input" defaultValue={centsToInput(p.cost)} inputMode="decimal" aria-label="Custo" />
                        <input name="price" className="input" defaultValue={centsToInput(p.price)} inputMode="decimal" aria-label="Preço" />
                        <button className="btn col-span-2">Salvar alterações</button>
                      </form>
                      <div className="space-y-2">
                        <form action={restockProduct} className="grid grid-cols-2 gap-2 rounded-xl bg-brand-soft/50 p-3">
                          <input type="hidden" name="id" value={p.id} />
                          <input name="qty" className="input" inputMode="numeric" placeholder="Qtd comprada" required aria-label="Quantidade" />
                          <input name="cost" className="input" inputMode="decimal" placeholder="Novo custo un. (opcional)" aria-label="Novo custo" />
                          <button className="btn col-span-2">Repor estoque</button>
                        </form>
                        <form action={archiveProduct}>
                          <input type="hidden" name="id" value={p.id} />
                          <button className="btn-danger">Remover produto</button>
                        </form>
                      </div>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </Section>
    </>
  );
}
