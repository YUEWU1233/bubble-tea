"use client";

import { useState } from "react";
import { categories, products, subcategories } from "./menu";

type CategoryId = (typeof categories)[number]["id"];

const priceFormatter = new Intl.NumberFormat("fr-CH", {
  style: "currency",
  currency: "CHF",
});

export default function PosPage() {
  const [categoryId, setCategoryId] = useState<CategoryId>(1);
  const [subcategoryId, setSubcategoryId] = useState("");

  const visibleSubcategories = Object.entries(subcategories).filter(
    ([, subcategory]) => subcategory.categoryId === categoryId,
  );

  const visibleProducts = products.filter((product) => {
    const matchesCategory =
      subcategories[product.subcategory].categoryId === categoryId;
    const matchesSubcategory =
      subcategoryId === "" || product.subcategory === subcategoryId;

    return matchesCategory && matchesSubcategory;
  });

  return (
    <main className="min-h-screen bg-stone-50 px-4 py-8 text-stone-900">
      <div className="mx-auto max-w-5xl">
        <h1 className="mb-6 text-3xl font-bold">店员收银</h1>

        <div className="mb-4 flex gap-2" role="group" aria-label="商品分类">
          {categories.map((category) => (
            <button
              key={category.id}
              type="button"
              aria-pressed={categoryId === category.id}
              onClick={() => {
                setCategoryId(category.id);
                setSubcategoryId("");
              }}
              className="rounded-lg border border-stone-300 bg-white px-5 py-2 font-medium aria-pressed:border-stone-900 aria-pressed:bg-stone-900 aria-pressed:text-white"
            >
              {category.name}
            </button>
          ))}
        </div>

        <div
          className="mb-6 flex flex-wrap gap-2"
          role="group"
          aria-label="细分品类"
        >
          {[["", { name: "全部" }] as const, ...visibleSubcategories].map(
            ([id, subcategory]) => (
              <button
                key={id}
                type="button"
                aria-pressed={subcategoryId === id}
                onClick={() => setSubcategoryId(id)}
                className="rounded-full border border-stone-300 bg-white px-4 py-1.5 text-sm aria-pressed:border-emerald-700 aria-pressed:bg-emerald-700 aria-pressed:text-white"
              >
                {subcategory.name}
              </button>
            ),
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleProducts.map((product) => (
            <article
              key={product.id}
              className="rounded-xl border border-stone-200 bg-white p-4"
            >
              <h2 className="mb-3 text-lg font-semibold">{product.name}</h2>

              <ul className="space-y-2">
                {product.variants.map((variant) => (
                  <li
                    key={variant.id}
                    className="flex justify-between gap-3 rounded-lg bg-stone-100 px-3 py-2 text-sm"
                  >
                    <span>{variant.label}</span>
                    <span className="whitespace-nowrap font-semibold">
                      {priceFormatter.format(variant.priceCents / 100)}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
