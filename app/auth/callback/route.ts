import { NextResponse, type NextRequest } from "next/server";
import { hasSupabase } from "@/lib/supabase/config";
import { serverClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type");

  if (hasSupabase && (code || (tokenHash && type === "email"))) {
    const supabase = await serverClient(true);
    const { error } = code
      ? await supabase.auth.exchangeCodeForSession(code)
      : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: "email" });
    if (!error) return redirect(request, "/criar-plano");
  }

  return redirect(request, "/login?erro=autenticacao");
}

function redirect(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
