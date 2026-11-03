import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Criar conta · Pop Dashboard" };

export default function CadastroPage() {
  if (process.env.ALLOW_REGISTER === "false") redirect("/login");
  return <AuthForm mode="register" canRegister />;
}
