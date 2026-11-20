import { z } from "zod";
import { macros, type Nutrients } from "./nutrition";

export const mealKeys = ["breakfast", "lunch", "dinner", "snack"] as const;
export const mealKey = z.enum(mealKeys);

const name = z.string().trim().min(1).max(120);
const amount = z.number().min(0.1).max(10000);
const nutrientFields = {
  calories: z.number().min(0).max(10000),
  protein_g: z.number().min(0).max(2000),
  carbs_g: z.number().min(0).max(2000),
  fat_g: z.number().min(0).max(2000),
};

export const photoFood = z.strictObject({
  name, quantity: amount, unit: z.enum(["g", "unidade"]), ...nutrientFields,
});
export const photoResult = z.strictObject({ foods: z.array(photoFood).max(16) });
export const photoEntry = photoFood.extend({ id: z.uuid() });
export type PhotoFood = z.infer<typeof photoFood>;

const ingredient = z.strictObject({ name, quantity: amount, unit: z.enum(["g", "ml", "unidade"]) });
const mealSuggestion = z.strictObject({
  name, ingredients: z.array(ingredient).min(1).max(10), ...nutrientFields,
});
export const planResult = z.strictObject({
  breakfast: mealSuggestion, lunch: mealSuggestion, dinner: mealSuggestion, snack: mealSuggestion,
});
export const mealEntry = mealSuggestion.extend({ id: z.uuid(), meal: mealKey });
export type MealEntry = z.infer<typeof mealEntry>;
export const mealDraft = z.strictObject({
  id: z.uuid(), day: z.iso.date(), entries: z.array(mealEntry).length(4),
}).refine(({ entries }) => new Set(entries.map(({ meal }) => meal)).size === 4);
export type MealDraft = z.infer<typeof mealDraft>;

const nutrientKeys = ["calories", ...macros.map(({ key }) => key)] as const;

export function sumNutrients(entries: Nutrients[]): Nutrients {
  return entries.reduce((sum, entry) => ({
    calories: sum.calories + entry.calories,
    protein_g: sum.protein_g + entry.protein_g,
    carbs_g: sum.carbs_g + entry.carbs_g,
    fat_g: sum.fat_g + entry.fat_g,
  }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
}

export function nearTargets(total: Nutrients, target: Nutrients) {
  return nutrientKeys.every((key) =>
    Math.abs(total[key] - target[key]) <= (key === "calories" ? target[key] * 0.15 : Math.max(8, target[key] * 0.25)));
}

export function roundNutrients(value: Nutrients): Nutrients {
  return {
    calories: roundPortion(value.calories), protein_g: roundPortion(value.protein_g),
    carbs_g: roundPortion(value.carbs_g), fat_g: roundPortion(value.fat_g),
  };
}

export function roundPortion(value: number) {
  return Math.round(value * 10) / 10;
}
