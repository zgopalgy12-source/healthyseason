import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseKey, supabaseUrl } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  const protectedRoute = ["/perfil", "/criar-plano", "/hoje", "/scanner", "/foto", "/plano"].some(
    (path) => request.nextUrl.pathname === path || request.nextUrl.pathname.startsWith(path + "/"),
  );
  let response = NextResponse.next({ request });
  let authenticated = false;

  if (supabaseUrl && supabaseKey) {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(toSet) {
          for (const { name, value } of toSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of toSet) response.cookies.set(name, value, options);
        },
      },
    });
    const { data } = await supabase.auth.getClaims();
    authenticated = Boolean(data?.claims.sub);
  }

  if (protectedRoute && !authenticated) {
    const login = NextResponse.redirect(new URL("/login", request.url));
    for (const cookie of response.cookies.getAll()) login.cookies.set(cookie);
    login.headers.set("Cache-Control", "private, no-store");
    return login;
  }

  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = {
  matcher: ["/perfil/:path*", "/criar-plano/:path*", "/hoje/:path*", "/scanner/:path*", "/foto/:path*", "/plano/:path*", "/api/scanner", "/api/food-photo", "/api/meal-plan", "/login", "/registo"],
};
