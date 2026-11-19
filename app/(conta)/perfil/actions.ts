"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAccount } from "@/lib/auth";
import { serverClient } from "@/lib/supabase/server";

type SaveState = { success: boolean; message: string };

export async function saveProfile(_: SaveState, form: FormData): Promise<SaveState> {
  const { id, supabase } = await requireAccount();
  const field = form.get("name");
  const name = typeof field === "string" ? field.trim() : "";

  if (!name || name.length > 120) {
    return { success: false, message: "Introduza um nome com 1 a 120 caracteres." };
  }

  const { error } = await supabase.from("profiles").upsert({ id, full_name: name });
  if (error) return { success: false, message: "Não foi possível guardar o perfil. Tente novamente." };

  revalidatePath("/perfil");
  return { success: true, message: "Perfil atualizado." };
}

export async function signOut(): Promise<void> {
  await requireAccount();
  const supabase = await serverClient(true);
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) redirect("/perfil?erro=sair");
  redirect("/login");
}
