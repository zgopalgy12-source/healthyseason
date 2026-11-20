"use client";

import { useState, useTransition } from "react";
import { ActionNotice, type AiSaveState } from "@/components/ai/action-notice";
import { NutrientSummary } from "@/components/ai/nutrient-summary";
import { useAiRequest } from "@/components/ai/use-ai-request";
import { meals } from "@/lib/diary";
import { sumNutrients, type MealDraft, type MealEntry } from "@/lib/meal-ai";
import { formatNumber, type Nutrients } from "@/lib/nutrition";
import { addSuggestedMeal, saveSuggestedPlan } from "./actions";

function PlanMeal({ item, day }: { item: MealEntry; day: string }) {
  const [state, setState] = useState<AiSaveState>({ message: "" });
  const [pending, start] = useTransition();
  const label = meals.find(({ key }) => key === item.meal)?.label;

  return <article className="card ai-section plan-meal">
    <p className="kicker">{label}</p>
    <h3>{item.name}</h3>
    <ul className="plan-ingredients">{item.ingredients.map(({ name, quantity, unit }, index) => <li key={index}>
      <span>{name}</span>
      <span>{formatNumber(quantity)} {unit === "unidade" && quantity !== 1 ? "unidades" : unit}</span>
    </li>)}</ul>
    <NutrientSummary value={item} />
    <ActionNotice state={state} diaryLink />
    <button type="button" className="button button-secondary" disabled={pending || state.success || state.expired}
      onClick={() => start(async () => {
        try {
          setState(await addSuggestedMeal(day, item));
        } catch {
          setState({ message: "Não foi possível adicionar a refeição. Tenta novamente." });
        }
      })}>
      {pending ? "A adicionar…" : state.success ? "Adicionada ao diário" : "Adicionar ao diário"}
    </button>
  </article>;
}

export function PlanTool({ target, saved }: { target: Nutrients; saved: MealDraft | null }) {
  const [draft, setDraft] = useState<MealDraft | null>(saved);
  const [savedId, setSavedId] = useState(saved?.id);
  const [saveState, setSaveState] = useState<AiSaveState>({ message: "" });
  const [saving, startSave] = useTransition();
  const { run, pending, error } = useAiRequest();

  async function suggest() {
    const result = await run<MealDraft>("/api/meal-plan", "{}", "application/json");
    if (result) {
      setDraft(result);
      setSaveState({ message: "" });
    }
  }

  return <>
    <section className="card ai-section">
      <h1>Plano de refeições</h1>
      <p>Recebe uma sugestão para hoje com base nas tuas metas, no objetivo e nas restrições alimentares.</p>
      <button type="button" className="button" disabled={pending || saving} onClick={suggest}>
        {pending ? "A gerar sugestão…" : "Sugerir plano de hoje"}
      </button>
      {pending && <p role="status">A preparar as quatro refeições do dia…</p>}
      {error && <p className="notice" role="alert">{error}</p>}
    </section>
    {draft && <>
      <section className="card ai-section">
        <h2>Total do dia</h2>
        <p>Valores estimados comparados com as tuas metas. Se tens alergias, confirma os ingredientes.</p>
        <NutrientSummary value={sumNutrients(draft.entries)} goal={target} />
        <ActionNotice state={saveState} />
        <button type="button" className="button button-secondary"
          disabled={saving || pending || draft.id === savedId || saveState.expired}
          onClick={() => startSave(async () => {
            try {
              const state = await saveSuggestedPlan(draft);
              setSaveState(state);
              if (state.success) setSavedId(draft.id);
            } catch {
              setSaveState({ message: "Não foi possível guardar o plano. Tenta novamente." });
            }
          })}>
          {saving ? "A guardar…" : draft.id === savedId ? "Plano guardado" : "Guardar plano"}
        </button>
      </section>
      {draft.entries.map((item) => <PlanMeal key={item.id} item={item} day={draft.day} />)}
    </>}
  </>;
}
