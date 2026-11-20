"use server";

import { requireAccount } from "@/lib/auth";
import { hasActiveTrial } from "@/lib/trial-server";

export async function joinWaitlist(_: { error: string; joined: boolean }, form: FormData) {
  const { supabase } = await requireAccount();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "Introduz um endereço de email válido.", joined: false };
  }

  if (await hasActiveTrial(supabase)) {
    return { error: "O teu teste grátis ainda está ativo.", joined: false };
  }

  const { error } = await supabase.from("waitlist").insert({ email }, { defaultToNull: false });
  if (error && error.code !== "23505") {
    return { error: "Não foi possível guardar o email. Tenta novamente.", joined: false };
  }

  return { error: "", joined: true };
}
