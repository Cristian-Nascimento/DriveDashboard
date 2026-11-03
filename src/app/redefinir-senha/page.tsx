import { redirect } from "next/navigation";
import { ResetForm } from "@/components/PasswordForms";

export const metadata = { title: "Nova senha · Pop Dashboard" };

export default async function RedefinirSenhaPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  if (!token) redirect("/esqueci-senha");
  return <ResetForm token={token} />;
}
