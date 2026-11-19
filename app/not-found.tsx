import Link from "next/link";
import { Brand } from "@/components/brand";

export default function NotFound() {
  return <main className="auth-shell">
    <Brand />
    <section className="card account-card">
      <h1>Página indisponível</h1>
      <p>O endereço pode ter sido alterado. Volte à página inicial para continuar.</p>
      <Link href="/" className="button">Voltar ao início</Link>
    </section>
  </main>;
}
