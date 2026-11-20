import { DiaryClock } from "@/components/diary-clock";
import { TrialExpiry } from "@/components/trial-expiry";
import { ExpiredTrial } from "@/components/waitlist/expired-trial";
import { requireAccount } from "@/lib/auth";
import { currentDiaryDay } from "@/lib/nutrition-server";
import { hasActiveTrial, trialTimeLeft } from "@/lib/trial-server";
import { PhotoTool } from "./photo-tool";

export const metadata = { title: "Foto da refeição" };

export default async function FoodPhoto() {
  const { email, supabase } = await requireAccount();
  if (!(await hasActiveTrial(supabase))) return <ExpiredTrial email={email ?? ""} />;
  const [{ iso }, milliseconds] = await Promise.all([currentDiaryDay(), trialTimeLeft()]);

  return <div className="scanner">
    <DiaryClock day={iso} />
    <TrialExpiry milliseconds={milliseconds} />
    <PhotoTool />
  </div>;
}
