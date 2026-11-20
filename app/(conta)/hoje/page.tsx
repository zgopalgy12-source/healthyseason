import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { requireAccount } from "@/lib/auth";
import { meals } from "@/lib/diary";
import { formatNumber, macros, type Nutrients } from "@/lib/nutrition";
import { currentDiaryDay, dailyTargets } from "@/lib/nutrition-server";
import { DiaryClock } from "./clock";
import { FoodForm } from "./food-form";

export const metadata = { title: "Hoje" };

type Food = Nutrients & { id: string; meal: string; name: string; quantity_g: number | null };

function Progress({ amount, goal, label }: { amount: number; goal: number; label: string }) {
  return <progress className="progress-track" max={goal || 1} value={Math.min(amount, goal)}
    aria-label={label} aria-valuetext={formatNumber(amount) + " de " + formatNumber(goal)} />;
}

export default async function Today() {
  const { supabase, id } = await requireAccount();
  const [targets, { iso: day }] = await Promise.all([dailyTargets(), currentDiaryDay()]);
  if (!targets) redirect("/criar-plano");

  const entries: Food[] = [];
  const pageSize = 200;
  for (let start = 0; ; start += pageSize) {
    const { data, error } = await supabase.from("food_logs")
      .select("id, meal, name, quantity_g, calories, protein_g, carbs_g, fat_g")
      .eq("user_id", id).eq("logged_on", day)
      .order("created_at").order("id").range(start, start + pageSize - 1);
    if (error) throw new Error("Não foi possível carregar o diário alimentar.");
    entries.push(...data as Food[]);
    if (data.length < pageSize) break;
  }

  const totals = entries.reduce<Nutrients>((sum, entry) => ({
    calories: sum.calories + entry.calories,
    protein_g: sum.protein_g + entry.protein_g,
    carbs_g: sum.carbs_g + entry.carbs_g,
    fat_g: sum.fat_g + entry.fat_g,
  }), { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
  const dateLabel = new Intl.DateTimeFormat("pt-PT", { dateStyle: "full", timeZone: "UTC" }).format(new Date(day));
  const remaining = Math.round((targets.calories - totals.calories) * 10) / 10;

  return <div className="today">
    <DiaryClock day={day} />
    <div className="today-heading"><h1>Hoje</h1><p><time dateTime={day}>{dateLabel}</time></p></div>
    <section className="card today-calories">
      <h2>Calorias consumidas</h2>
      <p><strong>{formatNumber(totals.calories)}</strong> / {formatNumber(targets.calories)} kcal</p>
      <Progress amount={totals.calories} goal={targets.calories} label="Calorias consumidas" />
      <p>{remaining > 0
        ? "Faltam " + formatNumber(remaining) + " kcal para a meta."
        : remaining < 0 ? formatNumber(-remaining) + " kcal acima da meta." : "Meta atingida."}</p>
    </section>
    <section className="today-section">
      <h2>Macronutrientes</h2>
      <div className="today-macros">{macros.map(({ key, label }) => <article key={key} className="card">
        <h3>{label}</h3><p><strong>{formatNumber(totals[key])}</strong> / {formatNumber(targets[key])} g</p>
        <Progress amount={totals[key]} goal={targets[key]} label={label} />
      </article>)}</div>
    </section>
    <section className="today-section">
      <h2>Refeições do dia</h2>
      <div className="meal-list">{meals.map(({ key, label }) => {
        const foods = entries.filter(({ meal }) => meal === key);
        return <article key={key} className="card meal-card">
          <h3>{label}</h3>
          {foods.length ? <ul>{foods.map((food) => <li key={food.id}>
            <span>{food.name}{food.quantity_g !== null && <small> · {formatNumber(food.quantity_g)} g</small>}</span>
            <span>{formatNumber(food.calories)} kcal</span>
          </li>)}</ul> : <p>Ainda sem alimentos registados.</p>}
          <FoodForm meal={key} day={day} initialId={randomUUID()} label={label} />
        </article>;
      })}</div>
    </section>
  </div>;
}
