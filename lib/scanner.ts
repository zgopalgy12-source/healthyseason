import type { Nutrients } from "./nutrition";

export type ProductNutrition = { [K in keyof Nutrients]: number | null };
export type Product = {
  barcode: string;
  name: string;
  brand: string | null;
  image: string | null;
  unit: "g" | "ml";
  per100: ProductNutrition;
  serving: { label: string | null; size: number | null; unit: "g" | "ml" | null; nutrition: ProductNutrition } | null;
};

export function normalizeBarcode(text: string) {
  const code = text.replace(/[\s-]/g, "");
  return /^(?:[0-9]{8}|[0-9]{12,14})$/.test(code) ? code : null;
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function label(value: unknown, max = 120) {
  return typeof value === "string" ? Array.from(value.trim()).slice(0, max).join("") || null : null;
}

function nonNegative(value: unknown) {
  const number = typeof value === "number" || (typeof value === "string" && value.trim()) ? Number(value) : NaN;
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function unit(value: unknown) {
  const name = typeof value === "string" ? value.trim().toLowerCase() : "";
  return name === "g" || name === "ml" ? name : null;
}

function imageUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (url.protocol === "https:" && ["images.openfoodfacts.org", "static.openfoodfacts.org"].includes(url.host)) return url.href;
  } catch {
    return null;
  }
  return null;
}

export function mapProduct(barcode: string, raw: unknown): Product | null {
  const data = record(raw);
  if (!Object.keys(data).length) return null;
  const facts = record(data.nutriments);
  const baseUnit = data.nutrition_data_per === "100ml" || unit(data.product_quantity_unit) === "ml" ? "ml" : "g";
  const servingLabel = label(data.serving_size);
  const match = servingLabel?.match(/(?:^|[\s(])(\d+(?:[.,]\d+)?)\s*(g|ml)\b/i);
  const declaredUnit = unit(data.serving_quantity_unit);
  const servingUnit = declaredUnit ?? unit(match?.[2]);
  const size = (declaredUnit ? nonNegative(data.serving_quantity) : null)
    ?? nonNegative(match?.[1].replace(",", "."));
  const gramsOrMl = size && servingUnit ? size : null;
  const factor = gramsOrMl && servingUnit === baseUnit ? gramsOrMl / 100 : null;

  function nutrition(suffix: "100g" | "serving", per100?: ProductNutrition): ProductNutrition {
    const kj = nonNegative(facts["energy-kj_" + suffix]) ?? nonNegative(facts["energy_" + suffix]);
    const given = {
      calories: nonNegative(facts["energy-kcal_" + suffix]) ?? (kj === null ? null : kj / 4.184),
      protein_g: nonNegative(facts["proteins_" + suffix]),
      carbs_g: nonNegative(facts["carbohydrates_" + suffix]),
      fat_g: nonNegative(facts["fat_" + suffix]),
    };
    if (!per100 || factor === null) return given;

    const scaled = (key: keyof Nutrients) => {
      const value = per100[key];
      return given[key] ?? (value === null ? null : value * factor);
    };
    return { calories: scaled("calories"), protein_g: scaled("protein_g"), carbs_g: scaled("carbs_g"), fat_g: scaled("fat_g") };
  }

  const per100 = nutrition("100g");
  const hasServing = servingLabel || gramsOrMl !== null || data.nutrition_data_per === "serving";
  return {
    barcode,
    name: label(data.product_name_pt) ?? label(data.product_name) ?? "Produto " + barcode,
    brand: label(data.brands),
    image: imageUrl(data.image_front_small_url) ?? imageUrl(data.image_front_url),
    unit: baseUnit,
    per100,
    serving: hasServing
      ? { label: servingLabel, size: gramsOrMl, unit: servingUnit, nutrition: nutrition("serving", per100) }
      : null,
  };
}

export function hasNutrition(values: ProductNutrition | undefined): values is Nutrients {
  return Boolean(values && [values.calories, values.protein_g, values.carbs_g, values.fat_g]
    .every((value) => typeof value === "number" && Number.isFinite(value) && value >= 0));
}

export function productPortion(product: Product, mode: string, quantity: number) {
  const serving = mode === "serving" ? product.serving : null;
  const values = mode === "serving" ? serving?.nutrition : mode === "weight" ? product.per100 : undefined;
  if (!hasNutrition(values)) return null;
  const factor = serving ? quantity : quantity / 100;
  const round = (value: number) => Math.round(value * 10) / 10;
  const amount = serving ? (serving.size === null ? null : round(serving.size * quantity)) : quantity;
  const unit = serving ? serving.unit : product.unit;
  const result = {
    calories: round(values.calories * factor),
    protein_g: round(values.protein_g * factor),
    carbs_g: round(values.carbs_g * factor),
    fat_g: round(values.fat_g * factor),
    quantity_g: unit === "g" ? amount : null,
    quantity_ml: unit === "ml" ? amount : null,
    servings: serving ? quantity : null,
  };
  if (result.calories > 10000 || [result.protein_g, result.carbs_g, result.fat_g].some((value) => value > 2000)
      || (amount !== null && (amount <= 0 || amount > 10000))) return null;
  return result;
}
