"use client";

import { useActionState, useRef, useState } from "react";
import { adjustInventory } from "./actions";

export function InventoryAdjustmentForm({ productId, name, mode }: { productId: string; name: string; mode: "restock" | "loss" }) {
  const label = mode === "loss" ? "报损" : "补货";
  const request = useRef<{ quantity: FormDataEntryValue | null; id: string } | null>(null);
  const [quantity, setQuantity] = useState("");
  const [result, submit, pending] = useActionState(async (previous: Parameters<typeof adjustInventory>[2], form: FormData) => {
    const input = form.get("quantity");
    if (request.current && request.current.quantity !== input) {
      return { status: "error", message: "请恢复原数量并重试，确认上一笔" + label + "。" } as const;
    }
    request.current ??= { quantity: input, id: crypto.randomUUID() };
    form.set("requestId", request.current.id);
    const next = await adjustInventory(mode, productId, previous, form).catch(() => ({ status: "error", message: label + "未确认，请按原数量重试。" }) as const);
    if (next.status === "saved" || next.status === "rejected") request.current = null;
    if (next.status === "saved") {
      setQuantity("");
    }
    return next;
  }, { status: "idle", message: "" } as const);

  return (
    <form action={submit} className="min-w-36">
      <div className="flex flex-wrap gap-2">
        <input aria-label={name + label + "个数"} name="quantity" type="number" min="1" max="2147483647" step="1"
          required disabled={pending} value={quantity} onChange={(event) => setQuantity(event.target.value)}
          placeholder="个数" className="w-20 rounded border px-2 py-1" />
        <button type="submit" disabled={pending} className={mode === "loss" ? "rounded border border-red-700 px-3 py-1 text-red-700 disabled:opacity-50" : "rounded bg-emerald-700 px-3 py-1 text-white disabled:opacity-50"}>
          {pending ? "登记中…" : label}
        </button>
      </div>
      {result.message && <p role="status" className="mt-1 text-xs">{result.message}</p>}
    </form>
  );
}
