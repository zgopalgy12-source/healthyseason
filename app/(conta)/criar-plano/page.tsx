import { redirect } from "next/navigation";
import { dailyTargets } from "@/lib/nutrition-server";
import { PlanForm } from "./plan-form";

export const metadata = { title: "Criar o meu plano" };

export default async function CreatePlan() {
  if (await dailyTargets()) redirect("/hoje");

  return <section className="card account-card">
    <h1>Criar o meu plano</h1>
    <p>Responda a algumas perguntas para estimar as suas metas diárias.</p>
    <PlanForm />
  </section>;
}
