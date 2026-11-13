"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { categories, products, subcategories, toppings } from "./menu";
import type { Product, Variant } from "./menu";

type CategoryId = (typeof categories)[number]["id"];

type CartProduct = Pick<Product, "id" | "name" | "unavailable"> & Partial<Pick<Product, "subcategory">>;

const toppingProducts: (CartProduct & { variants: Variant[] })[] = toppings.map(({ id, name, priceCents }) => ({
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
  { id: "uber", label: "Uber Eats" },
] as const;

type PaymentMethod = (typeof paymentMethods)[number];

const priceFormatter = new Intl.NumberFormat("fr-CH", {
  style: "currency",
  currency: "CHF",
});

function createCheckoutId() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();

  // Plain HTTP on the local network still supports getRandomValues.
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20)].join("-");
}

export default function PosPage() {
  const [categoryId, setCategoryId] = useState<CategoryId>(1);
  const [subcategoryId, setSubcategoryId] = useState("");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [stock, setStock] = useState<Record<string, number> | null>(null);
  const [stockError, setStockError] = useState(false);
  const stockRequest = useRef<AbortController | null>(null);

  const refreshStock = useCallback(async () => {
    stockRequest.current?.abort();
    const controller = new AbortController();
    stockRequest.current = controller;
    try {
      const response = await fetch("/api/inventory", { signal: controller.signal, cache: "no-store" });
      if (!response.ok) throw new Error("Inventory unavailable");
      const quantities = await response.json();
      if (controller.signal.aborted) return;
      setStock(quantities);
      setStockError(false);
    } catch {
      if (controller.signal.aborted) return;
      setStock(null);
      setStockError(true);
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(refreshStock, 0);
    return () => {
      window.clearTimeout(initial);
      stockRequest.current?.abort();
    };
  }, [refreshStock]);

  const checkoutDialog = useRef<HTMLDialogElement>(null);
  const checkoutButton = useRef<HTMLButtonElement>(null);
  const checkoutStatus = useRef<HTMLParagraphElement>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [requiresLogin, setRequiresLogin] = useState(false);
  const [checkoutId, setCheckoutId] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{
    totalCents: number;
    paymentMethod: PaymentMethod;
  } | null>(null);

  const subtotalCents = cart.reduce(
    (total, item) => total + item.variant.priceCents * item.quantity,
    0,
  );

  const baoSingles = cart.reduce((sum, { product, variant, quantity }) =>
    product.subcategory === "bao" && variant.id === "single" ? sum + quantity : sum, 0);
  const mixedTrios = Math.floor(baoSingles / 3);
  const discountCents = mixedTrios * 200;
  const totalCents = subtotalCents - discountCents;

  function openCheckout() {
    setPaymentMethod(null);
    setCheckoutError("");
    setRequiresLogin(false);
    const dialog = checkoutDialog.current;
    if (dialog) {
      dialog.returnValue = "";
      dialog.showModal();
    }
  }

  async function confirmCheckout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!paymentMethod || cart.length === 0 || isSubmitting) return;

    const orderCheckoutId = checkoutId ?? createCheckoutId();
    setCheckoutId(orderCheckoutId);
    setIsSubmitting(true);
    setCheckoutError("");
    setRequiresLogin(false);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          p_checkout_id: orderCheckoutId,
          p_payment_method: paymentMethod.id,
          p_items: cart.map(({ product, variant, quantity }) => ({
            product_id: product.id,
            variant_id: variant.id,
            quantity,
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setRequiresLogin(response.status === 401);
        if (response.status === 400 || response.status === 403 || response.status === 422 || response.status === 503) {
          setCheckoutId(null);
        }
        if (response.status === 422) void refreshStock();
        setCheckoutError(result.error || "结账失败，请重试。");
        return;
      }

      setCheckoutId(null);
      setReceipt({ totalCents: result.total_cents, paymentMethod });
      setCart([]);
      void refreshStock();
      checkoutDialog.current?.close("confirmed");
    } catch {
      setCheckoutError("尚未确认订单是否保存。请在此窗口重试同一笔订单。");
    } finally {
      setIsSubmitting(false);
    }
  }

  function canAdd(product: CartProduct, variant: Variant, items: CartItem[]) {
    if (product.unavailable) return false;
    if (!variant.stockUnits) return true;
    if (!stock) return false;
    const used = items.reduce((units, item) =>
      item.product.id === product.id ? units + (item.variant.stockUnits ?? 0) * item.quantity : units, 0);
    return used + variant.stockUnits <= (stock[product.id] ?? 0);
  }

  function changeQuantity(product: CartProduct, variant: Variant, change: 1 | -1) {
    setCart((currentCart) => {
      if (change === 1 && !canAdd(product, variant, currentCart)) return currentCart;
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

  const visibleProducts: readonly (CartProduct & Pick<Product, "variants">)[] = subcategoryId === "toppings"
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
                    disabled={!canAdd(product, variant, cart)}
                    aria-label={`增加${product.name} ${variant.label}`}
                    className="rounded border border-stone-300 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-40"
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
            {mixedTrios > 0 && (
              <p className="text-sm text-emerald-800">
                拼口味 × {mixedTrios} · 优惠 {priceFormatter.format(discountCents / 100)}
              </p>
            )}
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
              `结账完成 · ${receipt.paymentMethod.label} · ${priceFormatter.format(receipt.totalCents / 100)}`}
          </p>
        </section>

        <dialog
          ref={checkoutDialog}
          aria-labelledby="checkout-title"
          onCancel={(event) => {
            if (checkoutId) event.preventDefault();
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
            {requiresLogin && (
              <a href="/staff-login" target="_blank" rel="noopener" className="mt-2 inline-block text-sm font-medium text-emerald-800 underline">
                在新标签页重新登录
              </a>
            )}
            {checkoutError && (
              <p role="alert" className="mt-2 text-sm text-red-700">{checkoutError}</p>
            )}

            <fieldset disabled={isSubmitting || checkoutId !== null} className="mt-5">
              <legend className="mb-2 text-sm font-medium">付款方式</legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
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
                disabled={isSubmitting || checkoutId !== null}
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

        {categoryId === 1 && !stock && (
          <p role="status" className="mb-3 text-sm text-stone-600">
            {stockError ? "暂时无法读取库存，请刷新页面。" : "正在读取库存…"}
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visibleProducts.map((product) => {
            const soldOut = stock !== null && product.variants.some((variant) => variant.stockUnits) &&
              (stock[product.id] ?? 0) === 0;

            return (
              <article
                key={product.id}
                className={product.unavailable || soldOut ? "rounded-xl border border-stone-200 bg-stone-100 p-4 text-stone-500" : "rounded-xl border border-stone-200 bg-white p-4"}
              >
                <h2 className="mb-3 text-lg font-semibold">{product.name}{(product.unavailable || soldOut) && <span className="ml-2 text-sm font-normal">{product.unavailable ? "暂停供应" : "已售罄"}</span>}</h2>

                <ul className="space-y-2">
                  {product.variants.map((variant) => (
                    <li key={variant.id}>
                      <button
                        type="button"
                        onClick={() => changeQuantity(product, variant, 1)}
                        disabled={!canAdd(product, variant, cart)}
                        aria-label={`加入${product.name} ${variant.label}`}
                        className="flex w-full justify-between gap-3 rounded-lg bg-stone-100 px-3 py-2 text-left text-sm enabled:hover:bg-emerald-100 disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-500"
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
            );
          })}
        </div>
      </div>
    </main>
  );
}
