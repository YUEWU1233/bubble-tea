import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { InventoryAdjustmentForm } from "./restock-form";
import { checkOwnerSession } from "../owner-auth";
import { signOutOwner } from "../owner-login/actions";

const productNamesEn: Partial<Record<string, string>> = {
  B1: "Bao Pork",
  B2: "Bao Beef",
  B3: "Bao Carrot & Egg",
  B4: "Bao Mushroom & Zucchini",
  B5: "Bao Red Bean",
  R6: "Pork Dumplings",
  R7: "Carrot & Egg Dumplings",
  R8: "Beef Dumplings",
  R9: "Mushroom & Zucchini Dumplings",
};

type InventoryProduct = {
  id: string;
  name: string;
  inventory: { quantity_on_hand: number } | null;
};

async function loadInventory(): Promise<InventoryProduct[] | null> {
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) return null;

  try {
    const endpoint = new URL("/rest/v1/products", url);
    endpoint.searchParams.set("select", "id,name,inventory(quantity_on_hand)");
    endpoint.searchParams.set("subcategory_id", "in.(bao,dumplings)");
    endpoint.searchParams.set("order", "id.asc");

    const response = await fetch(endpoint, {
      headers: { apikey: secret },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.error("Inventory query failed", response.status);
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
}


async function OwnerInventory() {
  await connection();
  const status = await checkOwnerSession();

  if (status === "unavailable") {
    return <p className="p-6">暂时无法验证身份，请稍后刷新。</p>;
  }

  if (status !== "authorized") {
    redirect("/owner-login");
  }

  const products = await loadInventory();

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-4"><h1 className="text-2xl font-bold">库存管理 · Inventory</h1><Link href="/sales" className="text-sm underline">销售看板 · Sales</Link></div>
        <form action={signOutOwner}>
          <button type="submit" className="rounded-lg border px-4 py-2">
            退出登录 · Sign Out
          </button>
        </form>
      </div>
      {products === null ? (
        <p role="alert" className="mt-6">暂时无法读取库存，请稍后刷新页面。 Unable to load inventory. Please refresh.</p>
      ) : products.length === 0 ? (
        <p className="mt-6">暂无商品。 No products.</p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-stone-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-100 text-stone-900">
              <tr>
                <th scope="col" className="px-3 py-3">编号 · ID</th>
                <th scope="col" className="px-3 py-3">商品 · Product</th>
                <th scope="col" className="px-3 py-3 text-right">当前余量 · In Stock</th>
                <th scope="col" className="px-3 py-3">库存上新 · Restock</th>
                <th scope="col" className="px-3 py-3">损耗 · Waste</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              {products.map(({ id, name, inventory }) => (
                <tr key={id}>
                  <td className="break-all px-3 py-3">{id}</td>
                  <th scope="row" className="px-3 py-3 font-medium">{name}{productNamesEn[id] && <span lang="en" className="block font-normal">{productNamesEn[id]}</span>}</th>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums">
                    {inventory?.quantity_on_hand ?? "未录入 · Not Set"}
                  </td>
                  <td className="px-3 py-3"><InventoryAdjustmentForm productId={id} name={name} mode="restock" /></td>
                  <td className="px-3 py-3"><InventoryAdjustmentForm productId={id} name={name} mode="loss" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<p className="p-6">正在验证店主身份…</p>}>
      <OwnerInventory />
    </Suspense>
  );
}
