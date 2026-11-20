"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function useAiRequest() {
  const router = useRouter();
  const running = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function run<T>(path: string, body: BodyInit, type: string) {
    if (running.current) return null;
    running.current = true;
    setPending(true);
    setError("");
    try {
      const response = await fetch(path, { method: "POST", body, headers: { "Content-Type": type } });
      const data = await response.json().catch(() => null);
      if (response.ok && data) return data as T;
      if (response.status === 401) router.replace("/login");
      if (response.status === 403 && data?.expired) router.refresh();
      setError(data?.message ?? "Não foi possível concluir o pedido. Tenta novamente.");
    } catch {
      setError("Verifica a ligação e tenta novamente.");
    } finally {
      running.current = false;
      setPending(false);
    }
    return null;
  }

  return { run, pending, error, setError };
}
