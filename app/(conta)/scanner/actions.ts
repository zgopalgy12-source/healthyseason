"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireAccount } from "@/lib/auth";
import { meals } from "@/lib/diary";
import { readNumber } from "@/lib/nutrition";
import { currentDiaryDay, dailyTargets } from "@/lib/nutrition-server";
import { productPortion, type Product } from "@/lib/scanner";
import { hasActiveTrial } from "@/lib/trial-server";

type SaveState = { message: string; entryId: string; success?: boolean; expired?: boolean };
const uuid = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

export async function addScannedFood(scanId: string, state: SaveState, form: FormData): Promise<SaveState> {
  const { id, supabase } = await requireAccount();
  const fail = (message: string, expired = false) => ({ message, expired, entryId: state.entryId });
  if (!(await hasActiveTrial(supabase))) return fail("O teu teste grátis terminou.", true);
  if (!(await dailyTargets())) return fail("Cria o teu plano antes de adicionar alimentos.");

  const meal = String(form.get("meal") ?? "");
  const mode = String(form.get("mode") ?? "");
  const quantity = readNumber(form.get("quantity"), 0.1, 10000);
  const entryId = String(form.get("entry_id") ?? "");
  if (!uuid.test(scanId) || !uuid.test(entryId) || !meals.some(({ key }) => key === meal) || quantity === null) {
    return fail("Verifica a quantidade e a refeição. Usa até uma casa decimal.");
  }

  const { data, error } = await supabase.from("scans").select("product")
    .eq("user_id", id).eq("id", scanId).eq("outcome", "found").maybeSingle();
  if (error || !data) return fail("Não foi possível carregar o produto. Pesquisa o código novamente.");
  const product = data.product as Product;
  if (typeof product?.name !== "string" || !product.name.trim()) return fail("Os dados do produto estão incompletos.");
  const nutrients = productPortion(product, mode, quantity);
  if (!nutrients) return fail("Os valores nutricionais estão incompletos ou a quantidade é demasiado elevada.");

  const { iso } = await currentDiaryDay();
  const { error: saveError } = await supabase.from("food_logs").upsert({
    ...nutrients, id: entryId, user_id: id, logged_on: iso, meal, name: product.name, source: "product_scan",
  }, { onConflict: "id", ignoreDuplicates: true });

  if (saveError) {
    if (!(await hasActiveTrial(supabase))) return fail("O teu teste grátis terminou.", true);
    return fail("Não foi possível adicionar o produto. Tenta novamente.");
  }

  revalidatePath("/hoje");
  return { message: "Produto adicionado ao diário de hoje.", entryId: randomUUID(), success: true };
}
