"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function TrialExpiry({ milliseconds }: { milliseconds: number }) {
  const router = useRouter();

  useEffect(() => {
    const delay = milliseconds + 500;
    const deadline = performance.now() + delay;
    let refreshed = false;

    function onExpiry() {
      if (!refreshed && performance.now() >= deadline) {
        refreshed = true;
        router.refresh();
      }
    }
    const timer = window.setTimeout(onExpiry, delay + 10);
    window.addEventListener("focus", onExpiry);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("focus", onExpiry);
    };
  }, [milliseconds, router]);

  return null;
}
