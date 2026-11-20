import "server-only";
import sharp from "sharp";

const maxBytes = 4 * 1024 * 1024;
const formats: Record<string, string> = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" };

export class PhotoUploadError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function readFoodPhoto(request: Request) {
  const mime = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
  if (!Object.hasOwn(formats, mime)) throw new PhotoUploadError("Escolhe uma imagem JPEG, PNG ou WebP.", 415);
  const tooLarge = () => new PhotoUploadError("A imagem excede 4 MB. Experimenta uma foto mais pequena.", 413);
  if (Number(request.headers.get("content-length")) > maxBytes) throw tooLarge();
  if (!request.body) throw new PhotoUploadError("Seleciona uma foto para analisar.", 400);

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) {
        await reader.cancel().catch(() => {});
        throw tooLarge();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (!size) throw new PhotoUploadError("Seleciona uma foto para analisar.", 400);

  try {
    const image = sharp(Buffer.concat(chunks), { limitInputPixels: 16_000_000 });
    const meta = await image.metadata();
    if (meta.format !== formats[mime] || (meta.pages ?? 1) > 1) throw new Error("Formato inválido.");
    return await image.rotate().resize({
      width: 1280, height: 1280, fit: "inside", withoutEnlargement: true,
    }).flatten({ background: "#ffffff" }).jpeg({ quality: 80 }).toBuffer();
  } catch {
    throw new PhotoUploadError("A imagem é inválida ou não pôde ser aberta. Experimenta outra foto.", 415);
  }
}
