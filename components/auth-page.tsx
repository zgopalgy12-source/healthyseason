import Link from "next/link";
import { redirect } from "next/navigation";
import { currentAccount } from "@/lib/auth";
import { Brand } from "./brand";
import { AuthForm } from "./auth-form";

export async function AuthPage({ register, searchParams }: {
  register: boolean;
  searchParams: Promise<{ erro?: string }>;
}) {
  if (await currentAccount()) redirect("/criar-plano");
  const query = await searchParams;

  return <main className="auth-shell">
    <Brand />
    <section className="card auth-card">
      <h1>{register ? "Crie a sua conta" : "Entre na sua conta"}</h1>
      <p>{register ? "Comece a usar a Healthy Season." : "Bem-vindo à Healthy Season."}</p>
      <AuthForm register={register} callbackFailed={query.erro === "autenticacao"} />
      <p className="auth-switch">{register ? "Já tem conta? " : "Ainda não tem conta? "}
        <Link href={register ? "/login" : "/registo"}>{register ? "Entrar" : "Criar conta"}</Link>
      </p>
    </section>
  </main>;
}
