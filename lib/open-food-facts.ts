import "server-only";
import { mapProduct } from "./scanner";

const fields = "product_name_pt,product_name,brands,image_front_small_url,image_front_url,nutriments,serving_size,serving_quantity,serving_quantity_unit,nutrition_data_per,product_quantity_unit";

export async function findProduct(barcode: string) {
  const url = new URL("/api/v2/product/" + barcode, "https://world.openfoodfacts.org");
  url.searchParams.set("fields", fields);
  const response = await fetch(url, {
    headers: { "User-Agent": "HealthySeason/0.1 (https://github.com/zgopalgy12-source/healthyseason)" },
    next: { revalidate: 3600 },
    signal: AbortSignal.timeout(8000),
  });

  if (response.status === 404) return null;
  if (!response.ok) throw new Error("Open Food Facts indisponível.");

  const data = await response.json();
  if (data?.status === 0) return null;
  const product = mapProduct(barcode, data?.product);
  if (!product) throw new Error("Resposta inválida do Open Food Facts.");
  return product;
}
