import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { requireAccount } from "./auth";
import { dayInZone, defaultZone, zoneCookie } from "./diary";
import type { Nutrients } from "./nutrition";

export const dailyTargets = cache(async () => {
  const { id, supabase } = await requireAccount();
  const { data, error } = await supabase.from("daily_goals")
    .select("calories, protein_g, carbs_g, fat_g").eq("user_id", id).maybeSingle();
  if (error) throw new Error("Não foi possível carregar as metas diárias.");
  return data as Nutrients | null;
});

export async function currentDiaryDay() {
  const zone = (await cookies()).get(zoneCookie)?.value;
  if (zone && zone.length <= 100) {
    try {
      return { iso: dayInZone(zone), zone };
    } catch (error) {
      if (!(error instanceof RangeError)) throw error;
    }
  }
  return { iso: dayInZone(defaultZone), zone: defaultZone };
}
