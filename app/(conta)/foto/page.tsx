import { TrialExpiry } from "@/components/trial-expiry";
import Link from "next/link";
import { ExpiredTrial } from "@/components/waitlist/expired-trial";
import { requireAccount } from "@/lib/auth";
import { hasActiveTrial, trialTimeLeft } from "@/lib/trial-server";

export const metadata = { title: "Foto da refeição" };

export default async function FoodPhoto() {
  const { email, supabase } = await requireAccount();
  if (!(await hasActiveTrial(supabase))) return <ExpiredTrial email={email ?? ""} />;

  return <section className="card account-card">
    <TrialExpiry milliseconds={await trialTimeLeft()} />
    <h1>Foto da refeição</h1>
    <p>A análise de refeições por foto estará disponível na fase seguinte.</p>
    <Link href="/hoje" className="button button-secondary">Voltar a Hoje</Link>
  </section>;
}
