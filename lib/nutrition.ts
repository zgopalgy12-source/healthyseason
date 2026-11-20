export const activities = {
  sedentary: { label: "Sedentário", detail: "Pouco exercício", factor: 1.2 },
  light: { label: "Ligeiramente ativo", detail: "Exercício ligeiro 1 a 3 dias por semana", factor: 1.375 },
  moderate: { label: "Moderadamente ativo", detail: "Exercício moderado 3 a 5 dias por semana", factor: 1.55 },
  high: { label: "Muito ativo", detail: "Exercício intenso 6 a 7 dias por semana", factor: 1.725 },
  very_high: { label: "Atividade muito intensa", detail: "Treino intenso diário e trabalho físico", factor: 1.9 },
};

export const goals = {
  lose: { label: "Perder peso", adjustment: -300 },
  maintain: { label: "Manter peso", adjustment: 0 },
  gain: { label: "Ganhar peso", adjustment: 300 },
};

export const sexes = { female: "Feminino", male: "Masculino" };
export const measures = {
  age: { label: "Idade (anos)", min: 18, max: 120, step: 1 },
  height: { label: "Altura (cm)", min: 100, max: 250, step: 1 },
  weight: { label: "Peso atual (kg)", min: 30, max: 400, step: 0.1 },
  target: { label: "Peso objetivo (kg)", min: 30, max: 400, step: 0.1 },
};

export type PlanFields = Record<keyof typeof measures | "sex" | "activity" | "goal" | "restrictions", string>;

function hasKey<T extends object>(options: T, value: string): value is Extract<keyof T, string> {
  return Object.hasOwn(options, value);
}

export function readNumber(value: unknown, min: number, max: number, decimals = 1) {
  if (typeof value !== "string") return null;
  const text = value.trim().replace(",", ".");
  if (!/^\d+(?:\.\d+)?$/.test(text)) return null;
  const amount = Number(text);
  if (amount < min || amount > max || (text.split(".")[1]?.length ?? 0) > decimals) return null;
  return amount;
}

export function validatePlan(fields: PlanFields) {
  const { sex, activity, goal } = fields;
  const dietary_restrictions = fields.restrictions.trim();
  const age = readNumber(fields.age, 18, 120, 0);
  const height_cm = readNumber(fields.height, 100, 250, 0);
  const current_weight_kg = readNumber(fields.weight, 30, 400);
  const target_weight_kg = readNumber(fields.target, 30, 400);

  if (!hasKey(sexes, sex) || age === null || height_cm === null || current_weight_kg === null ||
      target_weight_kg === null || !hasKey(activities, activity) || !hasKey(goals, goal) || dietary_restrictions.length > 500) {
    return { error: "Verifique os dados do plano. A estimativa está disponível a partir dos 18 anos." } as const;
  }
  if ((goal === "lose" && target_weight_kg >= current_weight_kg) ||
      (goal === "gain" && target_weight_kg <= current_weight_kg)) {
    return { error: "O peso objetivo deve ser coerente com o objetivo selecionado." } as const;
  }

  const profile = { sex, age, height_cm, current_weight_kg, target_weight_kg, activity_level: activity, goal, dietary_restrictions };
  const resting = 10 * current_weight_kg + 6.25 * height_cm - 5 * age + (sex === "male" ? 5 : -161);
  const estimate = resting * activities[activity].factor + goals[goal].adjustment;
  const minimum = sex === "male" ? 1500 : 1200;
  if (estimate < minimum) {
    return { error: "A meta estimada fica abaixo do mínimo que a app usa para criar planos. Reveja os dados ou procure orientação individual." } as const;
  }

  const calories = Math.round(estimate);
  const targets = {
    calories,
    protein_g: Math.round(calories * 0.25 / 4),
    carbs_g: Math.round(calories * 0.45 / 4),
    fat_g: Math.round(calories * 0.30 / 9),
  };
  return { profile, targets } as const;
}

export const macros = [
  { key: "protein_g", label: "Proteína" },
  { key: "carbs_g", label: "Hidratos" },
  { key: "fat_g", label: "Gordura" },
] as const;

export type Nutrients = Record<(typeof macros)[number]["key"] | "calories", number>;
export const formatNumber = new Intl.NumberFormat("pt-PT", { maximumFractionDigits: 1 }).format;
