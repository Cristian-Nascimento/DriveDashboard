import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { archiveMachine, saveMachine } from "@/app/actions/data";
import { Empty, PageHeader, Section } from "@/components/ui";
import { ChangePasswordForm } from "@/components/PasswordForms";

export const metadata = { title: "Maquininhas · Pop Dashboard" };

type M = { id?: string; name: string; debitFee: number; creditFee: number; creditInstFee: number; pixFee: number };

const fmt = (n: number) => String(n).replace(".", ",");

function MachineForm({ m, cta }: { m?: M; cta: string }) {
  return (
    <form action={saveMachine} className="grid grid-cols-2 gap-3 sm:grid-cols-5">
      {m?.id && <input type="hidden" name="id" value={m.id} />}
      <div className="col-span-2 sm:col-span-5">
        <label className="label">Nome da maquininha</label>
        <input name="name" className="input" required maxLength={60} defaultValue={m?.name} placeholder="Ex.: Moderninha Smart 2" />
      </div>
      <div>
        <label className="label">Débito (%)</label>
        <input name="debitFee" className="input" inputMode="decimal" defaultValue={fmt(m?.debitFee ?? 0)} />
      </div>
      <div>
        <label className="label">Crédito à vista (%)</label>
        <input name="creditFee" className="input" inputMode="decimal" defaultValue={fmt(m?.creditFee ?? 0)} />
      </div>
      <div>
        <label className="label">Crédito parcelado (%)</label>
        <input name="creditInstFee" className="input" inputMode="decimal" defaultValue={fmt(m?.creditInstFee ?? 0)} />
      </div>
      <div>
        <label className="label">Pix (%)</label>
        <input name="pixFee" className="input" inputMode="decimal" defaultValue={fmt(m?.pixFee ?? 0)} />
      </div>
      <div className="flex items-end">
        <button className="btn w-full">{cta}</button>
      </div>
    </form>
  );
}

export default async function MaquininhasPage({ searchParams }: { searchParams: Promise<{ novo?: string; salvo?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const machines = await db.machine.findMany({ where: { userId: user.id, active: true }, orderBy: { name: "asc" } });

  return (
    <>
      <PageHeader title="Ajustes" subtitle="Maquininhas e taxas" />

      {sp.novo && (
        <p className="mb-4 rounded-xl bg-brand-soft px-4 py-3 text-sm">
          Bem-vindo! Já criamos a sua maquininha. <strong>Informe as taxas</strong> que o PagBank cobra para que o lucro líquido seja calculado corretamente.
        </p>
      )}
      {sp.salvo && <p className="mb-4 rounded-xl bg-pos/10 px-4 py-2.5 text-sm text-pos">Salvo. Vale para os próximos lançamentos; os já feitos mantêm a taxa da época.</p>}

      <Section title="Suas maquininhas">
        {machines.length === 0 ? (
          <Empty>Nenhuma maquininha cadastrada.</Empty>
        ) : (
          <div className="space-y-5">
            {machines.map((m) => (
              <div key={m.id} className="rounded-xl border border-line p-4">
                <MachineForm m={m} cta="Salvar" />
                <form action={archiveMachine} className="mt-2">
                  <input type="hidden" name="id" value={m.id} />
                  <button className="btn-danger">Remover maquininha</button>
                </form>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Alterar senha">
        <ChangePasswordForm />
      </Section>

      <Section title="Adicionar maquininha">
        <MachineForm cta="Adicionar" />
        <p className="mt-3 text-xs text-muted">
          As taxas são percentuais sobre o valor bruto. Dinheiro e repasse de app não têm taxa de maquininha.
        </p>
      </Section>
    </>
  );
}
