"use client";

import { useActionState, useState } from "react";
import { activities, formatNumber, goals, macros, measures, readNumber, sexes, validatePlan, type PlanFields } from "@/lib/nutrition";
import { savePlan } from "./actions";

const steps = ["Sobre si", "Peso e objetivo", "Atividade", "Preferências alimentares", "Resumo do plano"];
type Measure = keyof typeof measures;

const initialFields: PlanFields = {
  sex: "", age: "", height: "", weight: "", target: "", activity: "", goal: "", restrictions: "",
};

export function PlanForm() {
  const [fields, setFields] = useState(initialFields);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [saveError, action, pending] = useActionState(savePlan, "");
  const plan = step === 4 ? validatePlan(fields) : null;

  function update(key: keyof PlanFields, value: string) {
    setFields((previous) => ({ ...previous, [key]: value }));
    setError("");
  }

  function back() {
    setError("");
    setStep((previous) => previous - 1);
  }

  function measure(key: Measure) {
    const { label, min, max, step } = measures[key];
    return <label key={key}>{label}
      <input required inputMode={step === 1 ? "numeric" : "decimal"} value={fields[key]}
        onChange={(event) => update(key, event.target.value)} aria-describedby={key + "-range"} />
      <span className="field-hint" id={key + "-range"}>{min} a {max}</span>
    </label>;
  }

  function choices(key: "sex" | "goal" | "activity", title: string,
    options: { value: string; label: string; detail?: string }[]) {
    return <fieldset className="choices">
      <legend>{title}</legend>
      {options.map(({ value, label, detail }) => <label className="choice" key={value}>
        <input type="radio" name={key} value={value} checked={fields[key] === value} required
          onChange={() => update(key, value)} />
        <span>{label}{detail && <small>{detail}</small>}</span>
      </label>)}
    </fieldset>;
  }

  return <div className="plan-form">
    <p className="kicker">Passo {step + 1} de {steps.length}</p>
    <h2>{steps[step]}</h2>
    <progress className="progress-track" value={step + 1} max={steps.length} aria-label="Passos do plano" />
    {plan && "targets" in plan && plan.targets ? <>
      <dl className="plan-targets">
        <div><dt>Calorias por dia</dt><dd>{formatNumber(plan.targets.calories)} kcal</dd></div>
        {macros.map(({ key, label }) => <div key={key}><dt>{label}</dt><dd>{formatNumber(plan.targets[key])} g</dd></div>)}
      </dl>
      <p>Objetivo: {goals[plan.profile.goal].label.toLowerCase()} · Peso objetivo: {formatNumber(plan.profile.target_weight_kg)} kg</p>
      {plan.profile.dietary_restrictions && <p>Preferências e restrições: {plan.profile.dietary_restrictions}</p>}
      <p className="field-hint">Estas metas são estimativas diárias.</p>
      <form className="form" action={action}>
        {Object.entries(fields).map(([key, value]) => <input key={key} name={key} type="hidden" value={value} />)}
        {saveError && <p className="notice" role="alert">{saveError}</p>}
        <div className="form-buttons">
          <button type="button" onClick={back} className="button button-secondary" disabled={pending}>Voltar</button>
          <button className="button" disabled={pending}>{pending ? "A guardar…" : "Começar"}</button>
        </div>
      </form>
    </> : <form key={step} className="form" onSubmit={(event) => {
      event.preventDefault();
      const keys: Measure[] = step === 0 ? ["age", "height"] : step === 1 ? ["weight", "target"] : [];
      for (const key of keys) {
        const { min, max, step: increment, label } = measures[key];
        if (readNumber(fields[key], min, max, increment === 1 ? 0 : 1) === null) {
          setError(label + " deve estar entre " + min + " e " + max + (increment === 1 ? ", sem decimais." : ", com até uma casa decimal."));
          return;
        }
      }
      if (step === 1 && ((fields.goal === "lose" && Number(fields.target.replace(",", ".")) >= Number(fields.weight.replace(",", "."))) ||
          (fields.goal === "gain" && Number(fields.target.replace(",", ".")) <= Number(fields.weight.replace(",", "."))))) {
        setError("O peso objetivo deve ser coerente com o objetivo selecionado.");
        return;
      }
      if (step === 3) {
        const result = validatePlan(fields);
        if (result.error) {
          setError(result.error);
          return;
        }
      }
      setError("");
      setStep(step + 1);
    }}>
      {step === 0 && <>
        {choices("sex", "Sexo usado no cálculo", Object.entries(sexes).map(([value, label]) => ({ value, label })))}
        <div className="input-grid">{measure("age")}{measure("height")}</div>
      </>}
      {step === 1 && <>
        <div className="input-grid">{measure("weight")}{measure("target")}</div>
        {choices("goal", "Qual é o seu objetivo?", Object.entries(goals).map(([value, { label }]) => ({ value, label })))}
      </>}
      {step === 2 && choices("activity", "Nível de atividade habitual",
        Object.entries(activities).map(([value, { label, detail }]) => ({ value, label, detail })))}
      {step === 3 && <label>Preferências e restrições (opcional)
        <textarea rows={4} maxLength={500} placeholder="Por exemplo, alimentação vegetariana ou alergia a amendoins."
          value={fields.restrictions} onChange={(event) => update("restrictions", event.target.value)} />
      </label>}
      {error && <p className="notice" role="alert">{error}</p>}
      <div className="form-buttons">
        {step > 0 && <button type="button" onClick={back} className="button button-secondary">Voltar</button>}
        <button className="button">{step === 3 ? "Ver resumo" : "Continuar"}</button>
      </div>
    </form>}
  </div>;
}
