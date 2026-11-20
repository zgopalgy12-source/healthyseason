"use client";

import { useActionState } from "react";
import { macros } from "@/lib/nutrition";
import { addFood, type EntryState } from "./actions";

const initialState: EntryState = { message: "" };

export function FoodForm({ meal, day, initialId, label }: {
  meal: string; day: string; initialId: string; label: string;
}) {
  const [state, action, pending] = useActionState(addFood.bind(null, meal, day), initialState);
  return <details className="add-food" name="add-food">
    <summary className="button button-secondary">Adicionar<span className="sr-only"> a {label}</span></summary>
    <form className="form" action={action} key={day + ":" + (state.nextId ?? "") + ":" + (state.revision ?? 0)}>
      <input name="entry_id" type="hidden" value={state.nextId ?? initialId} />
      <label>Nome do alimento<input name="name" maxLength={120} required defaultValue={state.fields?.name} /></label>
      <p className="field-hint">Introduza os valores para a porção que comeu.</p>
      <div className="input-grid">
        <label>Quantidade (g, opcional)<input name="quantity" inputMode="decimal" defaultValue={state.fields?.quantity} /></label>
        <label>Calorias (kcal)<input name="calories" inputMode="decimal" required defaultValue={state.fields?.calories} /></label>
        {macros.map(({ key, label }) => <label key={key}>{label} (g)
          <input name={key} inputMode="decimal" required defaultValue={state.fields?.[key]} />
        </label>)}
      </div>
      {state.message && <p className="notice" role={state.fields ? "alert" : "status"}>{state.message}</p>}
      <button className="button" disabled={pending}>{pending ? "A guardar…" : "Guardar alimento"}</button>
    </form>
  </details>;
}
