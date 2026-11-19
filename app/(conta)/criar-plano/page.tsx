import Link from "next/link";
import { requireAccount } from "@/lib/auth";

export const metadata = { title: "Criar o meu plano" };

export default async function CreatePlan() {
  await requireAccount();

  return <section className="card account-card">
    <h1>Criar o meu plano</h1>
    <p>A criação do plano estará disponível na próxima fase. Já pode consultar e editar o seu perfil.</p>
    <Link className="button" href="/perfil">Abrir o perfil</Link>
  </section>;
}
