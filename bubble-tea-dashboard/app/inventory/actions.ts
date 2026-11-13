"use server";

import { revalidatePath } from "next/cache";
import { getOwnerSession } from "../owner-auth";

type RestockState = { status: "idle" | "error" | "rejected" | "saved"; message: string };

export async function adjustInventory(mode: "restock" | "loss", productId: string, _previous: RestockState, form: FormData): Promise<RestockState> {
  if (mode !== "restock" && mode !== "loss") {
    return { status: "rejected", message: "库存操作无效。" };
  }
  const label = mode === "loss" ? "报损" : "补货";
  const rpc = mode === "loss" ? "owner_record_loss" : "owner_restock";
  const owner = await getOwnerSession();
  if (owner.status !== "authorized") {
    return { status: "error", message: "无法验证店主权限，请重新登录或稍后再试。" };
  }

  const input = form.get("quantity");
  const requestId = form.get("requestId");
  const quantity = Number(input);
  if (typeof input !== "string" || !/^\d+$/.test(input) ||
      !Number.isInteger(quantity) || quantity < 1 || quantity > 2147483647 ||
      typeof requestId !== "string" || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(requestId)) {
    return { status: "error", message: "请输入有效的" + label + "个数。" };
  }

  try {
    const response = await fetch(new URL("/rest/v1/rpc/" + rpc, process.env.SUPABASE_URL), {
      method: "POST",
      headers: { apikey: process.env.SUPABASE_SECRET_KEY!, "Content-Type": "application/json" },
      body: JSON.stringify({ p_request_id: requestId, p_owner_id: owner.userId, p_product_id: productId, p_quantity: quantity }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      const error = await response.json().catch(() => null);
      if (error?.code === "P0001" && error.message === "Insufficient inventory for loss") {
        revalidatePath("/inventory");
        return { status: "rejected", message: "报损数量超过当前库存，请核对后重试。" };
      }
      if (error?.code === "PGRST202") {
        return { status: "rejected", message: label + "功能尚未在数据库启用。" };
      }
      if (mode === "loss") {
        const code = typeof error?.code === "string" && /^[A-Z0-9]{5,8}$/.test(error.code)
          ? error.code : "HTTP " + response.status;
        console.error("Inventory loss RPC failed", { code, message: error?.message });
        if (code === "23514") {
          return { status: "rejected", message: "数据库约束拒绝了报损（23514），库存未扣减。" };
        }
        return { status: "error", message: "报损未确认（" + code + "），请按原数量重试。" };
      }
      return { status: "error", message: label + "未确认，请按原数量重试。" };
    }
  } catch {
    return { status: "error", message: label + "未确认，请按原数量重试。" };
  }

  revalidatePath("/inventory");
  return { status: "saved", message: label + "已登记。" };
}
