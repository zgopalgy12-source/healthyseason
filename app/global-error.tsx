"use client";

import { ErrorState } from "@/components/error-state";
import "./globals.css";

export default function GlobalError({ reset }: { reset: () => void }) {
  return <html lang="pt-PT"><body><main className="auth-shell">
    <ErrorState reset={reset} />
  </main></body></html>;
}
