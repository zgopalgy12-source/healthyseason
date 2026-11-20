"use server";

import { redirect } from "next/navigation";
import { requireAccount } from "@/lib/auth";
import { validatePlan } from "@/lib/nutrition";
import { dailyTargets } from "@/lib/nutrition-server";

export async function savePlan(_: string, form: FormData) {
  const { supabase } = await requireAccount();
  if (await dailyTargets()) redirect("/hoje");

  const value = (key: string) => String(form.get(key) ?? "");
  const plan = validatePlan({
    sex: value("sex"), age: value("age"), height: value("height"),
    weight: value("weight"), target: value("target"), activity: value("activity"),
    goal: value("goal"), restrictions: value("restrictions"),
  });
  if (!plan.targets) return plan.error;

  const { error } = await supabase.rpc("save_nutrition_plan", {
    profile: plan.profile, targets: plan.targets,
  });
  if (error) return "Não foi possível guardar o plano. Tente novamente.";
  redirect("/hoje");
}
