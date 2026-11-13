import { checkStaffSession } from "../../staff-auth";
import { products } from "../../pos/menu";

const stockIds = products
  .filter((product) => product.variants.some((variant) => variant.stockUnits))
  .map((product) => product.id);

export async function GET() {
  const status = await checkStaffSession();
  if (status !== "authorized") {
    return new Response(null, { status: status === "signed-out" ? 401 : status === "forbidden" ? 403 : 503 });
  }

  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) return new Response(null, { status: 503 });

  try {
    const endpoint = new URL("/rest/v1/inventory", url);
    endpoint.searchParams.set("select", "product_id,quantity_on_hand");
    endpoint.searchParams.set("product_id", "in.(" + stockIds.join(",") + ")");
    const response = await fetch(endpoint, {
      headers: { apikey: secret },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return new Response(null, { status: 503 });

    const rows: { product_id: string; quantity_on_hand: number }[] = await response.json();
    const quantities = Object.fromEntries(rows.map((row) => [row.product_id, row.quantity_on_hand]));
    return Response.json(quantities, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return new Response(null, { status: 503 });
  }
}
