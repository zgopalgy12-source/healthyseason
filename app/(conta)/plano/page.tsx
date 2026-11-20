import { redirect } from "next/navigation";
import { DiaryClock } from "@/components/diary-clock";
import { TrialExpiry } from "@/components/trial-expiry";
import { ExpiredTrial } from "@/components/waitlist/expired-trial";
import { requireAccount } from "@/lib/auth";
import { mealDraft, mealKeys } from "@/lib/meal-ai";
import { currentDiaryDay, dailyTargets } from "@/lib/nutrition-server";
import { hasActiveTrial, trialTimeLeft } from "@/lib/trial-server";
import { PlanTool } from "./plan-tool";

export const metadata = { title: "Plano de refeições" };

export default async function MealPlanPage() {
  const { id, email, supabase } = await requireAccount();
  if (!(await hasActiveTrial(supabase))) return <ExpiredTrial email={email ?? ""} />;
  const [target, { iso }, milliseconds] = await Promise.all([dailyTargets(), currentDiaryDay(), trialTimeLeft()]);
  if (!target) redirect("/criar-plano");

  const { data, error } = await supabase.from("meal_plans")
    .select("suggestion_id, planned_for, meals(id,meal,name,ingredients,calories,protein_g,carbs_g,fat_g)")
    .eq("user_id", id).eq("planned_for", iso).maybeSingle();
  if (error) throw new Error("Não foi possível carregar o plano de refeições.");
  const saved = data ? mealDraft.safeParse({ id: data.suggestion_id, day: data.planned_for, entries: data.meals }) : null;
  if (saved && !saved.success) throw new Error("O plano de refeições guardado está incompleto.");
  saved?.data.entries.sort((a, b) => mealKeys.indexOf(a.meal) - mealKeys.indexOf(b.meal));

  return <div className="scanner">
    <DiaryClock day={iso} />
    <TrialExpiry milliseconds={milliseconds} />
    <PlanTool key={iso} target={target} saved={saved?.data ?? null} />
  </div>;
}
