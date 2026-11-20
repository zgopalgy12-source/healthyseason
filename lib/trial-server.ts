import "server-only";
import { cache } from "react";
import { requireAccount } from "./auth";

type Account = Awaited<ReturnType<typeof requireAccount>>;

export async function hasActiveTrial(supabase: Account["supabase"]) {
  const { data, error } = await supabase.rpc("has_active_trial");
  if (error) throw new Error("Não foi possível verificar o teste grátis.");
  return data === true;
}

export const trialEndsAt = cache(async () => {
  const { id, supabase } = await requireAccount();
  const { data, error } = await supabase.from("account_trials")
    .select("trial_ends_at").eq("user_id", id).maybeSingle();
  if (error) throw new Error("Não foi possível carregar o prazo do teste grátis.");
  return (data?.trial_ends_at ?? null) as string | null;
});

export async function trialTimeLeft() {
  const endsAt = await trialEndsAt();
  return endsAt ? Math.max(0, Date.parse(endsAt) - Date.now()) : 0;
}
