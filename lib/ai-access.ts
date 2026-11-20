import "server-only";
import { NextResponse } from "next/server";
import { currentAccount, requireAccount } from "./auth";
import { hasActiveTrial } from "./trial-server";
import { AiError } from "./ai-provider";

type Account = NonNullable<Awaited<ReturnType<typeof currentAccount>>>;
type Feature = "food_photo" | "meal_plan";

export const trialEnded = "O teu teste grátis terminou.";
export const retryLater = "Há muitos pedidos recentes. Tenta novamente mais tarde.";

export function aiReply(body: object, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "private, no-store" } });
}

export function expiredReply() {
  return aiReply({ expired: true, message: trialEnded }, 403);
}

export async function aiAccount() {
  const account = await currentAccount();
  if (!account) return { response: aiReply({ message: "Entra na tua conta para continuar." }, 401) } as const;
  if (!(await hasActiveTrial(account.supabase))) return { response: expiredReply() } as const;
  return { account } as const;
}

export async function reserveAiRequest(account: Account, feature: Feature) {
  const { data, error } = await account.supabase.rpc("reserve_ai_request", { feature });
  if (error?.code === "42501") return { response: expiredReply() } as const;
  if (error) throw new AiError("unavailable");
  if (typeof data !== "string") return { response: aiReply({ message: retryLater }, 429) } as const;
  return { id: data } as const;
}

export async function activeAccount() {
  const account = await requireAccount();
  return (await hasActiveTrial(account.supabase)) ? account : null;
}

export function aiErrorResponse(error: unknown, invalidMessage: string) {
  if (error instanceof AiError && error.code === "invalid") return aiReply({ message: invalidMessage }, 422);
  if (error instanceof AiError && error.code === "configuration") {
    return aiReply({ message: "A IA está temporariamente indisponível. Tenta novamente mais tarde." }, 503);
  }
  return aiReply({ message: "Não foi possível concluir o pedido. Tenta novamente." }, 502);
}
