"use client";

import { Camera, ImagePlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAiRequest } from "@/components/ai/use-ai-request";
import type { PhotoFood } from "@/lib/meal-ai";
import { PhotoEditor } from "./photo-editor";

async function compress(file: File) {
  const source = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = source;
    await image.decode();
    const scale = Math.min(1, 1280 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Imagem indisponível.");
    context.fillStyle = "#fff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Imagem indisponível.")), "image/jpeg", 0.8,
    ));
  } finally {
    URL.revokeObjectURL(source);
  }
}

type Analysis = { scanId: string; foods: PhotoFood[] };
type Preview = { image: Blob; url: string };

export function PhotoTool() {
  const [photo, setPhoto] = useState<Preview>();
  const selection = useRef(0);
  const previewUrl = useRef<string | undefined>(undefined);
  const [preparing, setPreparing] = useState(false);
  const [result, setResult] = useState<Analysis>();
  const { run, pending, error, setError } = useAiRequest();

  useEffect(() => () => {
    selection.current += 1;
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
  }, []);

  async function select(file?: File) {
    if (!file) return;
    const revision = ++selection.current;
    setResult(undefined);
    setPhoto(undefined);
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = undefined;
    setError("");
    setPreparing(true);
    try {
      const image = await compress(file);
      if (revision !== selection.current) return;
      previewUrl.current = URL.createObjectURL(image);
      setPhoto({ image, url: previewUrl.current });
    } catch {
      if (revision === selection.current) setError("Não foi possível abrir a imagem. Experimenta outra foto em JPEG, PNG ou WebP.");
    } finally {
      if (revision === selection.current) setPreparing(false);
    }
  }

  async function analyze() {
    if (!photo) return;
    const response = await run<Analysis>("/api/food-photo", photo.image, "image/jpeg");
    if (response) setResult(response);
  }

  const disabled = preparing || pending;
  return <>
    <section className="card ai-section">
      <h1>Foto da refeição</h1>
      <p>Tira uma foto ou escolhe uma imagem da galeria. A análise estima os alimentos e as porções.</p>
      <div className="ai-actions">
        <label className="button button-secondary file-button">
          <Camera size={19} aria-hidden="true" /> Tirar foto
          <input type="file" accept="image/*" capture="environment" disabled={disabled}
            onChange={(event) => { void select(event.target.files?.[0]); event.target.value = ""; }} />
        </label>
        <label className="button button-secondary file-button">
          <ImagePlus size={19} aria-hidden="true" /> Escolher imagem
          <input type="file" accept="image/*" disabled={disabled}
            onChange={(event) => { void select(event.target.files?.[0]); event.target.value = ""; }} />
        </label>
      </div>
      {preparing && <p role="status">A preparar a foto…</p>}
      {photo && <img className="food-preview" src={photo.url} alt="Pré-visualização da foto escolhida" />}
      {error && <p className="notice" role="alert">{error}</p>}
      <p className="field-hint">A foto é enviada à OpenAI para análise. A Healthy Season guarda apenas os resultados.</p>
      <button type="button" className="button" onClick={analyze} disabled={!photo || disabled}>
        {pending ? "A analisar…" : "Analisar refeição"}
      </button>
      {pending && <p role="status">A identificar os alimentos e a estimar as porções…</p>}
    </section>
    {result && <PhotoEditor key={result.scanId} {...result} />}
  </>;
}
