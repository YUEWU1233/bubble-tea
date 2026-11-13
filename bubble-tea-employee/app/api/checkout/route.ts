import { checkStaffSession } from "../../staff-auth";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (process.env.NODE_ENV !== "development" ||
      !origin ||
      !/^http:\/\/(localhost|127\.0\.0\.1|\[::1\]|192\.168\.1\.55)(:\d+)?$/.test(origin) ||
      origin !== `http://${request.headers.get("host")}`) {
    return Response.json({ error: "结账接口仅供已配置的开发地址使用。" }, { status: 403 });
  }

  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    return Response.json({ error: "结账服务尚未配置 Supabase。" }, { status: 503 });
  }

  const staffStatus = await checkStaffSession();
  if (staffStatus === "signed-out") {
    return Response.json({ error: "请重新登录后重试结账。" }, { status: 401 });
  }
  if (staffStatus === "forbidden") {
    return Response.json({ error: "当前账号没有收银权限。" }, { status: 403 });
  }
  if (staffStatus === "unavailable") {
    return Response.json({ error: "暂时无法验证店员身份，请重试。" }, { status: 503 });
  }

  const payload = await request.json().catch(() => null);
  if (
    !payload ||
    typeof payload.p_checkout_id !== "string" ||
    !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(payload.p_checkout_id) ||
    !["cash", "card", "uber"].includes(payload.p_payment_method) ||
    !Array.isArray(payload.p_items) ||
    payload.p_items.length < 1 ||
    payload.p_items.length > 200 ||
    !payload.p_items.every((item: { product_id?: unknown; variant_id?: unknown; quantity?: unknown } | null) =>
      item &&
      typeof item.product_id === "string" &&
      typeof item.variant_id === "string" &&
      typeof item.quantity === "number" &&
      Number.isInteger(item.quantity) &&
      item.quantity >= 1 && item.quantity <= 999
    )
  ) {
    return Response.json({ error: "订单内容无效，请检查商品数量。" }, { status: 400 });
  }

  try {
    const response = await fetch(new URL("/rest/v1/rpc/checkout_order", url), {
      method: "POST",
      headers: { apikey: secret, "Content-Type": "application/json" },
      body: JSON.stringify({
        p_checkout_id: payload.p_checkout_id,
        p_payment_method: payload.p_payment_method,
        p_items: payload.p_items,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const result = await response.json();

    if (response.ok && result && typeof result.order_id === "string" &&
        Number.isInteger(result.total_cents)) {
      return Response.json(result);
    }

    if (!response.ok && result?.code === "P0001") {
      const message = typeof result.message === "string" ? result.message : "";
      if (message.startsWith("Checkout ID already used")) {
        return Response.json({ error: "结账号已用于另一笔订单，请核对订单记录。" }, { status: 409 });
      }
      const error = message.startsWith("Inventory missing or insufficient")
        ? "商品库存未录入或不足，请检查库存后重试。"
        : "数据库拒绝了此订单，请检查商品与数量。";
      return Response.json({ error }, { status: 422 });
    }
  } catch {
    // The database may have committed before the connection failed.
  }
  return Response.json({ error: "尚未确认订单是否保存。请在此窗口重试同一笔订单。" }, { status: 502 });
}
