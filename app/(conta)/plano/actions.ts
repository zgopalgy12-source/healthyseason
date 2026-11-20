"use server";

import { revalidatePath } from "next/cache";
import type { AiSaveState } from "@/components/ai/action-notice";
import { activeAccount, trialEnded } from "@/lib/ai-access";
import { mealDraft, mealEntry, nearTargets, roundNutrients, sumNutrients } from "@/lib/meal-ai";
import { currentDiaryDay, dailyTargets } from "@/lib/nutrition-server";
import { hasActiveTrial } from "@/lib/trial-server";

export async function saveSuggestedPlan(draft: unknown): Promise<AiSaveState> {
  const account = await activeAccount();
  if (!account) return { message: trialEnded, expired: true };

  const plan = mealDraft.safeParse(draft);
  if (!plan.success) return { message: "A sugestão está incompleta. Gera outra para continuar." };
  const [{ iso }, targets] = await Promise.all([currentDiaryDay(), dailyTargets()]);
  if (plan.data.day !== iso) return { message: "O dia mudou. Pede uma sugestão para hoje." };
  if (!targets || !nearTargets(sumNutrients(plan.data.entries), targets)) {
    return { message: "A sugestão já não corresponde às tuas metas. Gera outra para continuar." };
  }

  const { supabase } = account;
  const { error } = await supabase.rpc("save_meal_plan", {
    suggestion: plan.data.id, day: iso, entries: plan.data.entries,
  });
  if (error) {
    if (!(await hasActiveTrial(supabase))) return { message: trialEnded, expired: true };
    return { message: "Não foi possível guardar o plano. Tenta novamente." };
  }

  revalidatePath("/plano");
  return { message: "Plano de hoje guardado.", success: true };
}

export async function addSuggestedMeal(day: string, entry: unknown): Promise<AiSaveState> {
  const account = await activeAccount();
  if (!account) return { message: trialEnded, expired: true };
  const [current, targets] = await Promise.all([currentDiaryDay(), dailyTargets()]);
  if (!targets) return { message: "Cria o teu plano nutricional antes de adicionar refeições." };
  if (day !== current.iso) return { message: "O dia mudou. Pede uma sugestão para hoje." };
  const meal = mealEntry.safeParse(entry);
  if (!meal.success) return { message: "A refeição está incompleta. Gera outra sugestão." };

  const { id, supabase } = account;
  const { error } = await supabase.from("food_logs").upsert({
    id: meal.data.id, user_id: id, logged_on: current.iso, name: meal.data.name, meal: meal.data.meal,
    source: "meal_plan", ...roundNutrients(meal.data),
  }, { onConflict: "id", ignoreDuplicates: true });
  if (error) {
    if (!(await hasActiveTrial(supabase))) return { message: trialEnded, expired: true };
    return { message: "Não foi possível adicionar a refeição. Tenta novamente." };
  }

  revalidatePath("/hoje");
  return { message: "Refeição adicionada ao diário de hoje.", success: true };
}
