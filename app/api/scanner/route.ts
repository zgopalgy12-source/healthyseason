import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { currentAccount } from "@/lib/auth";
import { findProduct } from "@/lib/open-food-facts";
import { normalizeBarcode, type Product } from "@/lib/scanner";
import { hasActiveTrial } from "@/lib/trial-server";

function reply(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export async function POST(request: Request) {
  const account = await currentAccount();
  if (!account) return reply({ message: "Entra na tua conta para usar o scanner." }, 401);

  try {
    if (!(await hasActiveTrial(account.supabase))) return reply({ expired: true }, 403);
    const body = request.headers.get("content-type")?.startsWith("application/json")
      ? await request.json().catch(() => null)
      : null;
    const barcode = typeof body?.barcode === "string" && body.barcode.length <= 64
      ? normalizeBarcode(body.barcode) : null;
    if (!barcode) return reply({ message: "Introduz um código de barras de 8, 12, 13 ou 14 dígitos." }, 400);

    let product: Product | null = null;
    let outcome = "not_found";
    try {
      product = await findProduct(barcode);
      if (product) outcome = "found";
    } catch {
      outcome = "unavailable";
    }

    const scanId = randomUUID();
    const { error } = await account.supabase.from("scans").insert({
      id: scanId, user_id: account.id, barcode, product, outcome,
    });
    if (error) {
      if (error.code === "42501" && !(await hasActiveTrial(account.supabase))) return reply({ expired: true }, 403);
      return reply({ message: "Não foi possível guardar o scan. Tenta novamente." }, 503);
    }
    if (!(await hasActiveTrial(account.supabase))) return reply({ expired: true }, 403);
    if (outcome === "unavailable") return reply({ message: "O Open Food Facts está indisponível. Tenta novamente daqui a pouco." }, 502);
    if (!product) return reply({ message: "Produto não encontrado no Open Food Facts. Verifica o código ou adiciona o alimento manualmente em Hoje." }, 404);
    return reply({ product, scanId, entryId: randomUUID() });
  } catch {
    return reply({ message: "Não foi possível verificar o acesso ao scanner. Tenta novamente." }, 503);
  }
}
