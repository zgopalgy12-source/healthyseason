"use client";

import { useEffect, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";
import { normalizeBarcode } from "@/lib/scanner";

type NativeDetector = { detect(video: HTMLVideoElement): Promise<{ rawValue: string }[]> };
type DetectorConstructor = {
  new (options: { formats: string[] }): NativeDetector;
  getSupportedFormats?: () => Promise<string[]>;
};

const formats = ["ean_13", "ean_8", "upc_a", "upc_e", "itf"];

function cameraError(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError" || error.name === "SecurityError") {
      return "O acesso à câmara foi recusado. Podes permiti-lo nas definições deste site ou escrever o código.";
    }
    if (error.name === "NotFoundError") return "Não foi encontrada uma câmara. Podes escrever o código.";
  }
  return "Não foi possível usar a câmara. Fecha outras apps que a possam estar a usar ou escreve o código.";
}

export function BarcodeCamera({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState("A pedir acesso à câmara…");
  const [error, setError] = useState("");

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;
    let found = false;
    let stream: MediaStream | undefined;
    let controls: IScannerControls | undefined;
    let timer: number | undefined;

    function release() {
      window.clearTimeout(timer);
      controls?.stop();
      controls = undefined;
      const camera = stream;
      stream = undefined;
      camera?.getTracks().forEach((track) => track.stop());
      if (video && video.srcObject === camera) video.srcObject = null;
    }

    function accept(raw: string) {
      const code = normalizeBarcode(raw);
      if (!code || cancelled || found) return;
      found = true;
      release();
      onCode(code);
    }

    async function fallback(element: HTMLVideoElement) {
      const { BrowserMultiFormatOneDReader } = await import("@zxing/browser");
      if (cancelled || found) return;
      const reader = new BrowserMultiFormatOneDReader();
      const decoder = await reader.decodeFromVideoElement(element, (result) => {
        if (result) accept(result.getText());
      });
      if (cancelled || found) decoder.stop();
      else controls = decoder;
    }

    async function start(element: HTMLVideoElement) {
      if (!window.isSecureContext) {
        setError("A câmara precisa de HTTPS ou localhost. Podes escrever o código.");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Este navegador não permite abrir a câmara. Podes escrever o código.");
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (cancelled) {
          release();
          return;
        }
        element.srcObject = stream;
        await element.play();
        if (cancelled) return;
        setStatus("Aponta a câmara ao código de barras da embalagem.");

        const Detector = (window as Window & { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
        if (Detector) {
          try {
            const available = await Detector.getSupportedFormats?.();
            const supported = available ? formats.filter((format) => available.includes(format)) : formats;
            if (supported.length && !cancelled) {
              const detector = new Detector({ formats: supported });
              async function readFrame() {
                if (cancelled || found) return;
                try {
                  const codes = await detector.detect(element);
                  for (const { rawValue } of codes) accept(rawValue);
                } catch {
                  if (!cancelled && !found && stream) {
                    try {
                      await fallback(element);
                    } catch (failure) {
                      if (!cancelled) {
                        release();
                        setError(cameraError(failure));
                      }
                    }
                  }
                  return;
                }
                if (!cancelled && !found) timer = window.setTimeout(readFrame, 150);
              }
              void readFrame();
              return;
            }
          } catch {
            // Continue with the decoder when the native API cannot initialize.
          }
        }
        if (!cancelled) await fallback(element);
      } catch (failure) {
        release();
        if (!cancelled) setError(cameraError(failure));
      }
    }

    void start(video);
    return () => {
      cancelled = true;
      release();
    };
  }, [onCode]);

  return <div className="barcode-camera">
    <div className="camera-preview" hidden={Boolean(error)}>
      <video ref={videoRef} autoPlay muted playsInline aria-label="Pré-visualização da câmara" />
      <span aria-hidden="true" />
    </div>
    {error ? <p className="notice" role="alert">{error}</p> : <p role="status">{status}</p>}
    <button type="button" className="button button-secondary" onClick={onClose}>Fechar câmara</button>
  </div>;
}
