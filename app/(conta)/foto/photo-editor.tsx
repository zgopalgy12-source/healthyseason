"use client";

import { useActionState, useState } from "react";
import { ActionNotice, type AiSaveState } from "@/components/ai/action-notice";
import { NutrientSummary } from "@/components/ai/nutrient-summary";
import { meals } from "@/lib/diary";
import { roundNutrients, sumNutrients, type PhotoFood } from "@/lib/meal-ai";
import { macros, readNumber, type Nutrients } from "@/lib/nutrition";
import { savePhotoFoods } from "./actions";

const fields = [
  { key: "calories", label: "Calorias (kcal)", max: 10000 },
  ...macros.map(({ key, label }) => ({ key, label: label + " (g)", max: 2000 })),
] as const;

type Row = {
  id: string; name: string; quantity: string; unit: PhotoFood["unit"];
  values: Record<keyof Nutrients, string>;
  reference: { quantity: number; nutrients: Nutrients };
};
const zero = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };

function buildRow(food: PhotoFood): Row {
  return {
    id: crypto.randomUUID(), name: food.name, quantity: String(food.quantity), unit: food.unit,
    values: {
      calories: String(food.calories), protein_g: String(food.protein_g),
      carbs_g: String(food.carbs_g), fat_g: String(food.fat_g),
    },
    reference: { quantity: food.quantity, nutrients: roundNutrients(food) },
  };
}

function editPortion(row: Row, text: string): Row {
  const quantity = readNumber(text, 0.1, 10000);
  if (quantity === null) return { ...row, quantity: text };
  const factor = quantity / row.reference.quantity;
  const original = row.reference.nutrients;
  const changed = roundNutrients({
    calories: original.calories * factor, protein_g: original.protein_g * factor,
    carbs_g: original.carbs_g * factor, fat_g: original.fat_g * factor,
  });
  return {
    ...row, quantity: text,
    values: {
      calories: String(changed.calories), protein_g: String(changed.protein_g),
      carbs_g: String(changed.carbs_g), fat_g: String(changed.fat_g),
    },
  };
}

function parseRow(row: Row) {
  return {
    id: row.id, name: row.name, quantity: readNumber(row.quantity, 0.1, 10000), unit: row.unit,
    calories: readNumber(row.values.calories, 0, 10000),
    protein_g: readNumber(row.values.protein_g, 0, 2000),
    carbs_g: readNumber(row.values.carbs_g, 0, 2000),
    fat_g: readNumber(row.values.fat_g, 0, 2000),
  };
}

export function PhotoEditor({ scanId, foods }: { scanId: string; foods: PhotoFood[] }) {
  const [rows, setRows] = useState(() => foods.map(buildRow));
  const [meal, setMeal] = useState("lunch");
  const [state, action, pending] = useActionState(savePhotoFoods.bind(null, scanId), { message: "" } as AiSaveState);

  function update(id: string, change: (row: Row) => Row) {
    setRows((previous) => previous.map((row) => row.id === id ? change(row) : row));
  }

  const entries = rows.map(parseRow);
  const valid = entries.length > 0 && entries.every((entry) =>
    entry.name.trim() && entry.quantity !== null && fields.every(({ key }) => entry[key] !== null));
  const total = sumNutrients(entries.map((entry) => ({
    calories: entry.calories ?? 0, protein_g: entry.protein_g ?? 0,
    carbs_g: entry.carbs_g ?? 0, fat_g: entry.fat_g ?? 0,
  })));

  return <section className="card ai-section">
    <h2>Revê os alimentos</h2>
    <p>As porções e os valores nutricionais são estimativas. Corrige o que for preciso antes de guardar.</p>
    {state.success ? <ActionNotice state={state} diaryLink /> : <form className="form" action={action}>
      <input type="hidden" name="foods" value={JSON.stringify(entries)} />
      {rows.map((row, index) => <fieldset key={row.id} className="ai-editor" disabled={pending}>
        <legend>Alimento {index + 1}</legend>
        <label>Nome<input value={row.name} maxLength={120} required
          onChange={(event) => update(row.id, (value) => ({ ...value, name: event.target.value }))} /></label>
        <div className="input-grid">
          <label>Porção<input inputMode="decimal" value={row.quantity} maxLength={10} required
            onChange={(event) => update(row.id, (value) => editPortion(value, event.target.value))} /></label>
          <label>Unidade<select value={row.unit} onChange={(event) => update(row.id,
            (value) => ({ ...value, unit: event.target.value === "g" ? "g" : "unidade" }))}>
            <option value="g">Gramas (g)</option><option value="unidade">Unidades</option>
          </select></label>
          {fields.map(({ key, label, max }) => <label key={key}>{label}
            <input inputMode="decimal" maxLength={10} value={row.values[key]} required onChange={(event) => {
              const text = event.target.value;
              update(row.id, (value) => {
                const quantity = readNumber(value.quantity, 0.1, 10000);
                const amount = readNumber(text, 0, max);
                const nutrients = { ...value.reference.nutrients };
                if (quantity !== null && amount !== null) nutrients[key] = amount * value.reference.quantity / quantity;
                return { ...value, values: { ...value.values, [key]: text }, reference: { ...value.reference, nutrients } };
              });
            }} />
          </label>)}
        </div>
        <button type="button" className="button button-secondary" onClick={() =>
          setRows((previous) => previous.filter(({ id }) => id !== row.id))}>Remover alimento</button>
      </fieldset>)}
      <button type="button" className="button button-secondary" disabled={pending || rows.length >= 16}
        onClick={() => setRows((previous) => [...previous, buildRow({ name: "", quantity: 1, unit: "unidade", ...zero })])}>
        Adicionar alimento manualmente
      </button>
      <NutrientSummary value={total} />
      <label>Refeição<select name="meal" value={meal} disabled={pending} onChange={(event) => setMeal(event.target.value)}>
        {meals.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
      </select></label>
      <ActionNotice state={state} />
      <button className="button" disabled={!valid || pending || state.expired}>
        {pending ? "A guardar…" : "Guardar no diário"}
      </button>
    </form>}
  </section>;
}
