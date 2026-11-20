"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { Barcode } from "lucide-react";
import { meals } from "@/lib/diary";
import { formatNumber, macros } from "@/lib/nutrition";
import { hasNutrition, type Product } from "@/lib/scanner";
import { addScannedFood } from "./actions";

export type ScanResult = { product: Product; scanId: string; entryId: string };

function AddProduct({ product, scanId, entryId }: ScanResult) {
  const per100 = hasNutrition(product.per100);
  const portion = hasNutrition(product.serving?.nutrition);
  const [mode, setMode] = useState(per100 ? "weight" : "serving");
  const [quantity, setQuantity] = useState(per100 ? "100" : "1");
  const [meal, setMeal] = useState<(typeof meals)[number]["key"]>("lunch");
  const [state, action, pending] = useActionState(addScannedFood.bind(null, scanId), { message: "", entryId });
  const router = useRouter();

  useEffect(() => {
    if (state.expired) router.refresh();
  }, [state.expired, router]);

  if (!per100 && !portion) return <p className="notice">
    Faltam valores nutricionais para adicionar este produto. Confere o rótulo e adiciona-o manualmente em <Link href="/hoje">Hoje</Link>.
  </p>;

  return <form className="form" action={action}>
    <input type="hidden" name="entry_id" value={state.entryId} />
    <div className="input-grid">
      <label>Unidade<select name="mode" value={mode} onChange={(event) => {
        setMode(event.target.value);
        setQuantity(event.target.value === "serving" ? "1" : "100");
      }}>
        {per100 && <option value="weight">{product.unit === "ml" ? "Mililitros (ml)" : "Gramas (g)"}</option>}
        {portion && <option value="serving">Porções</option>}
      </select></label>
      <label>Quantidade<input name="quantity" inputMode="decimal" value={quantity}
        onChange={(event) => setQuantity(event.target.value)} required maxLength={10} /></label>
      <label>Refeição<select name="meal" value={meal}
        onChange={(event) => setMeal(event.target.value as typeof meal)}>
        {meals.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
      </select></label>
    </div>
    {state.message && <p className="notice" role={state.success ? "status" : "alert"}>
      {state.message} {state.success && <Link href="/hoje">Ver Hoje</Link>}
    </p>}
    <button className="button" disabled={pending || state.expired}>
      {pending ? "A adicionar…" : "Adicionar ao diário"}
    </button>
  </form>;
}

export function ProductCard(result: ScanResult) {
  const { product } = result;
  const rows = [{ key: "calories", label: "Calorias", unit: "kcal" } as const,
    ...macros.map(({ key, label }) => ({ key, label, unit: "g" }))];
  const display = (value: number | null, unit: string) => value === null ? "—" : formatNumber(value) + " " + unit;

  return <section className="card product-card" aria-label="Produto encontrado">
    <div className="product-header">
      {product.image ? <img alt="" src={product.image} loading="lazy" referrerPolicy="no-referrer" />
        : <span className="product-no-image"><Barcode size={28} aria-hidden="true" /></span>}
      <div><h2>{product.name}</h2>{product.brand && <p>{product.brand}</p>}</div>
    </div>
    <table className="nutrition-table">
      <thead><tr><th scope="col">Nutrição</th><th scope="col">Por 100 {product.unit}</th>
        {product.serving && <th scope="col">Por porção</th>}</tr></thead>
      <tbody>{rows.map(({ key, label, unit }) => <tr key={key}>
        <th scope="row">{label}</th><td>{display(product.per100[key], unit)}</td>
        {product.serving && <td>{display(product.serving.nutrition[key], unit)}</td>}
      </tr>)}</tbody>
    </table>
    {product.serving?.label && <p className="field-hint">Porção indicada: {product.serving.label}</p>}
    <p className="field-hint">Dados e imagem de <a href={"https://world.openfoodfacts.org/product/" + product.barcode}>Open Food Facts</a>.</p>
    <AddProduct {...result} />
  </section>;
}
