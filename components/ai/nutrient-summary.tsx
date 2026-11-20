import { formatNumber, macros, type Nutrients } from "@/lib/nutrition";

export function NutrientSummary({ value, goal }: { value: Nutrients; goal?: Nutrients }) {
  const nutrients = [{ key: "calories", label: "Calorias", unit: "kcal" } as const,
    ...macros.map((macro) => ({ ...macro, unit: "g" }))];
  return <dl className="ai-nutrients">
    {nutrients.map(({ key, label, unit }) => <div key={key}>
      <dt>{label}</dt>
      <dd>{formatNumber(value[key])}{goal && " / " + formatNumber(goal[key])} {unit}</dd>
    </div>)}
  </dl>;
}
