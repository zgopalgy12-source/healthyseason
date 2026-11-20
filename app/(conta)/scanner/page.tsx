import { DiaryClock } from "@/components/diary-clock";
import { TrialExpiry } from "@/components/trial-expiry";
import { ExpiredTrial } from "@/components/waitlist/expired-trial";
import { requireAccount } from "@/lib/auth";
import { currentDiaryDay } from "@/lib/nutrition-server";
import { hasActiveTrial, trialTimeLeft } from "@/lib/trial-server";
import { ProductScanner } from "./scanner";

export const metadata = { title: "Scanner" };

export default async function ScannerPage() {
  const { email, supabase } = await requireAccount();
  if (!(await hasActiveTrial(supabase))) return <ExpiredTrial email={email ?? ""} />;

  const [{ iso }, milliseconds] = await Promise.all([currentDiaryDay(), trialTimeLeft()]);
  return <div className="scanner">
    <DiaryClock day={iso} />
    <TrialExpiry milliseconds={milliseconds} />
    <ProductScanner />
  </div>;
}
