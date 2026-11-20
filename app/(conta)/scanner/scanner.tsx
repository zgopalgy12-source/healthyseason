"use client";

import { useCallback, useRef, useState, type FormEvent } from "react";
import { Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { normalizeBarcode } from "@/lib/scanner";
import { BarcodeCamera } from "./camera";
import { ProductCard, type ScanResult } from "./product-card";

export function ProductScanner() {
  const router = useRouter();
  const loading = useRef(false);
  const [barcode, setBarcode] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ScanResult>();

  const lookup = useCallback(async (input: string) => {
    if (loading.current) return;
    const code = normalizeBarcode(input);
    if (!code) {
      setError("Introduz um código de barras de 8, 12, 13 ou 14 dígitos.");
      return;
    }

    loading.current = true;
    setBarcode(code);
    setCameraOpen(false);
    setError("");
    setResult(undefined);
    setBusy(true);

    try {
      const response = await fetch("/api/scanner", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ barcode: code }),
      });
      const data = await response.json();
      if (response.status === 401) {
        router.replace("/login");
        return;
      }
      if (response.status === 403 && data.expired) {
        setError("O teu teste grátis terminou.");
        router.refresh();
        return;
      }
      if (!response.ok) {
        setError(data.message ?? "Não foi possível consultar o produto.");
        return;
      }
      setResult(data);
    } catch {
      setError("Não foi possível consultar o produto. Verifica a ligação e tenta novamente.");
    } finally {
      setBusy(false);
      loading.current = false;
    }
  }, [router]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void lookup(barcode);
  }

  return <>
    <section className="card scanner-controls">
      <h1>Scanner de produtos</h1>
      <p>Digitaliza o código da embalagem ou escreve-o para consultar os valores nutricionais.</p>
      {cameraOpen ? <BarcodeCamera onCode={lookup} onClose={() => setCameraOpen(false)} />
        : <div className="camera-start">
          <button type="button" className="button button-secondary" disabled={busy}
            onClick={() => { setError(""); setCameraOpen(true); }}>
            <Camera size={19} aria-hidden="true" /> Abrir câmara
          </button>
          <p className="field-hint">O navegador vai pedir permissão para usar a câmara.</p>
        </div>}
      <form className="form manual-barcode" method="post" onSubmit={submit}>
        <label>Código de barras<input inputMode="numeric" autoComplete="off" name="barcode" maxLength={32}
          value={barcode} onChange={(event) => setBarcode(event.target.value)} required /></label>
        <button className="button" disabled={busy}>{busy ? "A consultar…" : "Pesquisar produto"}</button>
      </form>
      {busy && <p role="status">A consultar o Open Food Facts…</p>}
      {error && <p className="notice" role="alert">{error}</p>}
    </section>
    {result && <ProductCard key={result.scanId} {...result} />}
  </>;
}
