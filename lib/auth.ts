import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { hasSupabase } from "./supabase/config";
import { serverClient } from "./supabase/server";

export const currentAccount = cache(async () => {
  if (!hasSupabase) return null;
  const supabase = await serverClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;

  return { id: claims.sub, email: claims.email, supabase };
});

export async function requireAccount() {
  const account = await currentAccount();
  if (!account) redirect("/login");
  return account;
}
