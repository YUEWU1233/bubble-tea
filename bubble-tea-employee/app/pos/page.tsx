"use client";

import { useRef, useState } from "react";
import type { FormEvent } from "react";
import { categories, products, subcategories, toppings } from "./menu";
import type { Product, Variant } from "./menu";

type CategoryId = (typeof categories)[number]["id"];

type CartProduct = Pick<Product, "id" | "name">;

const toppingProducts = toppings.map(({ id, name, priceCents }) => ({
  id: `topping:${id}`,
  name,
  variants: [{ id: "portion", label: "加一份", priceCents }],
}));

type CartItem = {
  product: CartProduct;
  variant: Variant;
  quantity: number;
};

const paymentMethods = [
  { id: "cash", label: "现金" },
  { id: "card", label: "刷卡" },
] as const;

type PaymentMethod = (typeof paymentMethods)[number];

const priceFormatter = new Intl.NumberFormat("fr-CH", {
  style: "currency",
  currency: "CHF",
});

export default function PosPage() {
  const [categoryId, setCategoryId] = useState<CategoryId>(1);
  const [subcategoryId, setSubcategoryId] = useState("");

  const [cart, setCart] = useState<CartItem[]>([]);
  const checkoutDialog = useRef<HTMLDialogElement>(null);
  const checkoutButton = useRef<HTMLButtonElement>(null);
  const checkoutStatus = useRef<HTMLParagraphElement>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<{
    totalCents: number;
    paymentMethod: PaymentMethod;
  } | null>(null);

  const totalCents = cart.reduce(
    (total, item) => total + item.variant.priceCents * item.quantity,
    0,
  );

  function openCheckout() {
    setPaymentMethod(null);
    const dialog = checkoutDialog.current;
    if (dialog) {
      dialog.returnValue = "";
      dialog.showModal();
    }
  }

  async function confirmCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!paymentMethod || cart.length === 0 || isSubmitting) return;

    setIsSubmitting(true);
    // Simulate a request until the checkout API is available.
    await new Promise<void>((resolve) => window.setTimeout(resolve, 350));

    setReceipt({ totalCents, paymentMethod });
    setCart([]);
    setIsSubmitting(false);
    checkoutDialog.current?.close("confirmed");
  }

  function changeQuantity(product: CartProduct, variant: Variant, change: 1 | -1) {
    setCart((currentCart) => {
      const matches = (item: CartItem) =>
        item.product.id === product.id && item.variant.id === variant.id;

      if (!currentCart.some(matches)) {
        if (change === -1) return currentCart;
        return [...currentCart, { product, variant, quantity: 1 }];
      }

      return currentCart
        .map((item) =>
          matches(item) ? { ...item, quantity: item.quantity + change } : item,
        )
        .filter((item) => item.quantity > 0);
    });
  }

  const categorySubcategories = Object.entries(subcategories).filter(
    ([, subcategory]) => subcategory.categoryId === categoryId,
  );

  const visibleSubcategories = [
    ["", { name: "全部" }] as const,
    ...categorySubcategories,
    ...(categoryId === 2 ? [["toppings", { name: "小料" }] as const] : []),
  ];

  const visibleProducts = subcategoryId === "toppings"
    ? toppingProducts
    : products.filter((product) => {
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
          {visibleSubcategories.map(
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

        <section className="mb-6 rounded-xl border border-stone-200 bg-white p-4">
          <h2 className="mb-3 text-lg font-semibold">购物车</h2>

          {cart.length === 0 && (
            <p className="text-sm text-stone-500">点击商品规格加入购物车。</p>
          )}

          <ul className="divide-y divide-stone-200">
            {cart.map(({ product, variant, quantity }) => (
              <li
                key={`${product.id}:${variant.id}`}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="font-medium">{product.name}</p>
                  <p className="text-sm text-stone-500">{variant.label}</p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => changeQuantity(product, variant, -1)}
                    aria-label={`减少${product.name} ${variant.label}`}
                    className="rounded border border-stone-300 px-3 py-1"
                  >
                    −
                  </button>
                  <span>{quantity}</span>
                  <button
                    type="button"
                    onClick={() => changeQuantity(product, variant, 1)}
                    aria-label={`增加${product.name} ${variant.label}`}
                    className="rounded border border-stone-300 px-3 py-1"
                  >
                    +
                  </button>
                  <span className="font-semibold">
                    {priceFormatter.format((variant.priceCents * quantity) / 100)}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-3 flex flex-wrap items-center justify-end gap-4 border-t border-stone-200 pt-3">
            <p aria-live="polite" className="font-bold">
              总计 {priceFormatter.format(totalCents / 100)}
            </p>
            <button
              ref={checkoutButton}
              type="button"
              disabled={cart.length === 0}
              onClick={openCheckout}
              className="rounded-lg bg-emerald-700 px-5 py-2 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              结账
            </button>
          </div>
          <p
            ref={checkoutStatus}
            tabIndex={-1}
            role="status"
            className={receipt ? "mt-3 text-sm text-emerald-800" : "sr-only"}
          >
            {receipt &&
              `模拟结账完成 · ${receipt.paymentMethod.label} · ${priceFormatter.format(receipt.totalCents / 100)}`}
          </p>
        </section>

        <dialog
          ref={checkoutDialog}
          aria-labelledby="checkout-title"
          onCancel={(event) => {
            if (isSubmitting) event.preventDefault();
          }}
          onClose={(event) => {
            if (event.currentTarget.returnValue === "confirmed") {
              checkoutStatus.current?.focus();
            } else {
              checkoutButton.current?.focus();
            }
          }}
          className="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-sm rounded-xl bg-white p-6 text-stone-900 shadow-xl backdrop:bg-black/45"
        >
          <form onSubmit={confirmCheckout}>
            <h2 id="checkout-title" className="text-xl font-semibold">结账</h2>
            <p className="mt-2 font-medium">
              应收 {priceFormatter.format(totalCents / 100)}
            </p>
            <p className="mt-1 text-sm text-stone-600">模拟结账</p>

            <fieldset disabled={isSubmitting} className="mt-5">
              <legend className="mb-2 text-sm font-medium">付款方式</legend>
              <div className="grid grid-cols-2 gap-2">
                {paymentMethods.map((method) => (
                  <label
                    key={method.id}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-300 px-3 py-2 has-checked:border-emerald-700 has-checked:bg-emerald-50"
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method.id}
                      checked={paymentMethod?.id === method.id}
                      onChange={() => setPaymentMethod(method)}
                      className="accent-emerald-700"
                    />
                    {method.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => checkoutDialog.current?.close("cancelled")}
                className="rounded-lg border border-stone-300 px-4 py-2 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={!paymentMethod || isSubmitting}
                className="rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "提交中…" : "确认收款"}
              </button>
            </div>
          </form>
        </dialog>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleProducts.map((product) => (
            <article
              key={product.id}
              className="rounded-xl border border-stone-200 bg-white p-4"
            >
              <h2 className="mb-3 text-lg font-semibold">{product.name}</h2>

              <ul className="space-y-2">
                {product.variants.map((variant) => (
                  <li key={variant.id}>
                    <button
                      type="button"
                      onClick={() => changeQuantity(product, variant, 1)}
                      aria-label={`加入${product.name} ${variant.label}`}
                      className="flex w-full justify-between gap-3 rounded-lg bg-stone-100 px-3 py-2 text-left text-sm hover:bg-emerald-100"
                    >
                      <span>{variant.label}</span>
                      <span className="whitespace-nowrap font-semibold">
                        {priceFormatter.format(variant.priceCents / 100)}
                      </span>
                    </button>
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
