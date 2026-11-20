"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { AiSaveState } from "@/components/ai/action-notice";
import { activeAccount, trialEnded } from "@/lib/ai-access";
import { mealKey, photoEntry, roundNutrients, roundPortion } from "@/lib/meal-ai";
import { currentDiaryDay, dailyTargets } from "@/lib/nutrition-server";
import { hasActiveTrial } from "@/lib/trial-server";

const foodEntries = z.array(photoEntry).min(1).max(16)
  .refine((entries) => new Set(entries.map(({ id }) => id)).size === entries.length);

export async function savePhotoFoods(scanId: string, _: AiSaveState, form: FormData): Promise<AiSaveState> {
  const account = await activeAccount();
  if (!account) return { message: trialEnded, expired: true };
  if (!(await dailyTargets())) return { message: "Cria o teu plano nutricional antes de adicionar alimentos." };

  const meal = mealKey.safeParse(form.get("meal"));
  const payload = form.get("foods");
  let data: unknown;
  try {
    if (typeof payload === "string" && payload.length <= 18000) data = JSON.parse(payload);
  } catch {
    return { message: "Verifica os alimentos antes de guardar." };
  }
  const foods = foodEntries.safeParse(data);
  if (!meal.success || !foods.success || !z.uuid().safeParse(scanId).success) {
    return { message: "Verifica os nomes, porções e valores nutricionais antes de guardar." };
  }

  const { id, supabase } = account;
  const { data: scan, error } = await supabase.from("scans").select("id")
    .eq("user_id", id).eq("id", scanId).eq("type", "food_photo").eq("outcome", "found").maybeSingle();
  if (error || !scan) return { message: "Não foi possível confirmar a análise. Analisa a foto novamente." };

  const { iso } = await currentDiaryDay();
  const { error: saveError } = await supabase.from("food_logs").upsert(foods.data.map((food) => ({
    id: food.id, user_id: id, logged_on: iso, meal: meal.data, name: food.name,
    quantity_g: food.unit === "g" ? roundPortion(food.quantity) : null,
    quantity_units: food.unit === "unidade" ? roundPortion(food.quantity) : null,
    source: "food_photo", ...roundNutrients(food),
  })), { onConflict: "id", ignoreDuplicates: true });
  if (saveError) {
    if (!(await hasActiveTrial(supabase))) return { message: trialEnded, expired: true };
    return { message: "Não foi possível guardar a refeição. Tenta novamente." };
  }

  revalidatePath("/hoje");
  return { message: "Refeição guardada no diário de hoje.", success: true };
}
