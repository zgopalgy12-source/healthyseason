"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export type AiSaveState = { message: string; success?: boolean; expired?: boolean };

export function ActionNotice({ state, diaryLink = false }: { state: AiSaveState; diaryLink?: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (state.expired) router.refresh();
  }, [state.expired, router]);

  if (!state.message) return null;
  return <p className="notice" role={state.success ? "status" : "alert"}>
    {state.message} {state.success && diaryLink && <Link href="/hoje">Ver Hoje</Link>}
  </p>;
}
