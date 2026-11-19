import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseKey, supabaseUrl } from "./config";

export async function serverClient(writable = false) {
  if (!supabaseUrl || !supabaseKey) throw new Error("Configuração do Supabase em falta.");
  const jar = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll(toSet) {
        // Server Components are read-only. The proxy refreshes their cookies.
        if (writable) {
          for (const { name, value, options } of toSet) jar.set(name, value, options);
        }
      },
    },
  });
}
