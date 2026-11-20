"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/auth";
import { meals } from "@/lib/diary";
import { readNumber } from "@/lib/nutrition";
import { currentDiaryDay, dailyTargets } from "@/lib/nutrition-server";

export type EntryState = {
  message: string;
  nextId?: string;
  fields?: Record<string, string>;
  revision?: number;
};

export async function addFood(meal: string, day: string, state: EntryState, form: FormData): Promise<EntryState> {
  const account = await requireAccount();
  const fields = Object.fromEntries(["name", "quantity", "calories", "protein_g", "carbs_g", "fat_g"]
    .map((key) => [key, String(form.get(key) ?? "")]));
  const id = String(form.get("entry_id") ?? "");
  const validId = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(id);
  const failure = (message: string) => ({
    message, fields, nextId: validId ? id : state.nextId, revision: (state.revision ?? 0) + 1,
  });
  if (!meals.some(({ key }) => key === meal) || !validId) {
    return failure("Não foi possível preparar o registo. Atualize a página.");
  }
  if (!(await dailyTargets())) return failure("Crie o seu plano antes de adicionar alimentos.");
  if ((await currentDiaryDay()).iso !== day) {
    revalidatePath("/hoje");
    return failure("O dia mudou. Confirme os dados e guarde novamente.");
  }

  const name = fields.name.trim();
  const quantity_g = readNumber(fields.quantity, 0.1, 10000);
  const calories = readNumber(fields.calories, 0, 10000);
  const protein_g = readNumber(fields.protein_g, 0, 2000);
  const carbs_g = readNumber(fields.carbs_g, 0, 2000);
  const fat_g = readNumber(fields.fat_g, 0, 2000);
  if (!name || name.length > 120 || (fields.quantity.trim() && quantity_g === null) ||
      calories === null || protein_g === null || carbs_g === null || fat_g === null) {
    return failure("Verifique o nome, as calorias e os macros. Use até uma casa decimal e deixe a quantidade vazia se não a souber.");
  }

  const { error } = await account.supabase.from("food_logs").upsert({
    id, user_id: account.id, logged_on: day, meal, name, quantity_g, calories, protein_g, carbs_g, fat_g,
  }, { onConflict: "id", ignoreDuplicates: true });
  if (error) return failure("Não foi possível adicionar o alimento. Tente novamente.");

  revalidatePath("/hoje");
  return { message: "Alimento adicionado.", nextId: randomUUID() };
}
