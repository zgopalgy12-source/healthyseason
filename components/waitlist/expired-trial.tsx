import Link from "next/link";
import { WaitlistForm } from "./form";

export function ExpiredTrial({ email }: { email: string }) {
  return <section className="card account-card">
    <h1>O teu teste grátis terminou</h1>
    <p>Entra na lista de espera para receber novidades sobre o scanner, a análise de fotos e as sugestões de refeições.</p>
    <WaitlistForm email={email} />
    <Link className="button button-secondary" href="/hoje">Voltar a Hoje</Link>
  </section>;
}
