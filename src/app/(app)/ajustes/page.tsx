import { PageHeader, Section } from "@/components/ui";
import { ChangePasswordForm } from "@/components/PasswordForms";
import { ThemeToggle } from "@/components/ThemeToggle";

export const metadata = { title: "Ajustes · Pop Dashboard" };

export default function AjustesPage() {
  return (
    <>
      <PageHeader title="Ajustes" subtitle="Aparência e senha" />

      <Section title="Aparência">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted">Alterne entre o tema claro e o escuro. A escolha fica salva neste aparelho.</p>
          <div className="w-44 shrink-0 rounded-xl border border-line">
            <ThemeToggle variant="row" />
          </div>
        </div>
      </Section>

      <Section title="Alterar senha">
        <ChangePasswordForm />
      </Section>
    </>
  );
}
