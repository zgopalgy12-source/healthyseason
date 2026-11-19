import { createBrowserClient } from "@supabase/ssr";
import { supabaseKey, supabaseUrl } from "./config";

export function browserClient() {
  if (!supabaseUrl || !supabaseKey) throw new Error("Configuração do Supabase em falta.");
  return createBrowserClient(supabaseUrl, supabaseKey);
}
