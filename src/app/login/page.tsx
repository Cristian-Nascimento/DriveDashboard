import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Entrar · Pop Dashboard" };

export default function LoginPage() {
  return <AuthForm mode="login" canRegister={process.env.ALLOW_REGISTER !== "false"} />;
}
