import Link from "next/link";
import { trialTimeLeft } from "@/lib/trial-server";

export async function TrialNotice() {
  const days = Math.ceil(await trialTimeLeft() / 86_400_000);
  return <p className="trial-notice">
    {days > 0 ? "Teste grátis: falta" + (days === 1 ? " 1 dia" : "m " + days + " dias")
      : <Link href="/scanner">O teu teste grátis terminou</Link>}
  </p>;
}
