"use client";

import { Brand } from "@/components/brand";
import { ErrorState } from "@/components/error-state";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="auth-shell">
    <Brand />
    <ErrorState reset={reset} />
  </main>;
}
