import "server-only";
import { z } from "zod";

type AiErrorCode = "configuration" | "unavailable" | "invalid";

export class AiError extends Error {
  constructor(readonly code: AiErrorCode) {
    super(code);
  }
}

type AiInput = { instructions: string; prompt: string; image?: Buffer };

async function openAi(model: string, apiKey: string, input: AiInput, name: string, schema: object) {
  const content: object[] = [{ type: "input_text", text: input.prompt }];
  if (input.image) content.push({
    type: "input_image", image_url: "data:image/jpeg;base64," + input.image.toString("base64"), detail: "high",
  });

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: "Bearer " + apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      model, store: false, instructions: input.instructions, max_output_tokens: 3500,
      reasoning: model === "gpt-6.1-terra" ? { effort: "low" } : undefined,
      input: [{ role: "user", content }],
      text: { format: { type: "json_schema", name, schema, strict: true } },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(40_000),
  }).catch(() => { throw new AiError("unavailable"); });
  if (!response.ok) throw new AiError(response.status === 401 || response.status === 403 || response.status === 404 ? "configuration" : "unavailable");

  const body = await response.json().catch(() => null);
  if (body?.status !== "completed" || !Array.isArray(body.output)) throw new AiError("invalid");
  const text: string[] = [];
  for (const item of body.output) {
    if (item?.type !== "message" || !Array.isArray(item.content)) continue;
    for (const part of item.content) {
      if (part?.type === "refusal") throw new AiError("invalid");
      if (part?.type === "output_text" && typeof part.text === "string") text.push(part.text);
    }
  }
  try {
    return JSON.parse(text.join(""));
  } catch {
    throw new AiError("invalid");
  }
}

export function configuredAi() {
  const provider = process.env.AI_PROVIDER?.trim().toLowerCase();
  const model = process.env.AI_MODEL?.trim();
  const key = process.env.AI_API_KEY?.trim();
  if (provider !== "openai" || !model || !key) throw new AiError("configuration");

  return async function generate<T extends z.ZodType>(input: AiInput, name: string, validator: T): Promise<z.output<T>> {
    const { $schema, ...schema } = z.toJSONSchema(validator, { target: "draft-7", io: "input" });
    const parsed = validator.safeParse(await openAi(model, key, input, name, schema));
    if (!parsed.success) throw new AiError("invalid");
    return parsed.data;
  };
}
