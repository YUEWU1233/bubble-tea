import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { checkOwnerSession } from "../owner-auth";

type Filters = Promise<{ start?: string; end?: string; payment?: string; shift?: string }>;
type Sale = { sale_date: string; payment_method: string; order_count: number; total_cents: number; food_cents: number; drink_cents: number };

const methods = { cash: "现金", card: "刷卡", uber: "Uber Eats" };
const dateFormat = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Zurich", dateStyle: "short" });
const money = new Intl.NumberFormat("fr-CH", { style: "currency", currency: "CHF", minimumFractionDigits: 0 });

function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

async function loadSales(start: string, end: string, shift: number | null): Promise<Sale[] | null> {
  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) return null;

  try {
    const response = await fetch(new URL("/rest/v1/rpc/owner_daily_sales_by_category", url), {
      method: "POST",
      headers: { apikey: secret, "Content-Type": "application/json" },
      body: JSON.stringify({ p_start: start, p_end: end, p_shift: shift }),
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

async function OwnerSales({ searchParams }: { searchParams: Filters }) {
  await connection();
  const status = await checkOwnerSession();
  if (status === "unavailable") return <p className="p-6">暂时无法验证身份，请稍后刷新。</p>;
  if (status !== "authorized") redirect("/owner-login");

  const filters = await searchParams;
  const today = dateFormat.format(new Date());
  const defaultStart = new Date(Date.parse(today) - 6 * 86400000).toISOString().slice(0, 10);
  const start = filters.start ?? defaultStart;
  const end = filters.end ?? today;
  const payment = Object.keys(methods).find((method) => method === filters.payment) ?? "";
  const shift = filters.shift === "1" || filters.shift === "2" ? Number(filters.shift) : null;
  const validRange = validDate(start) && validDate(end) && start <= end &&
    Date.parse(end) - Date.parse(start) <= 365 * 86400000;
  const sales = validRange ? await loadSales(start, end, shift) : null;
  const totals = { cash: 0, card: 0, uber: 0 };
  const daily = new Map<string, { cents: number; count: number; food: number; drink: number }>();
  if (sales) {
    for (let day = Date.parse(start); day <= Date.parse(end); day += 86400000) {
      daily.set(new Date(day).toISOString().slice(0, 10), { cents: 0, count: 0, food: 0, drink: 0 });
    }
    for (const row of sales) {
      if (row.payment_method === "cash" || row.payment_method === "card" || row.payment_method === "uber") {
        totals[row.payment_method] += row.total_cents;
      }
      const day = daily.get(row.sale_date);
      if (day && (!payment || row.payment_method === payment)) {
        day.cents += row.total_cents;
        day.count += row.order_count;
        day.food += row.food_cents;
        day.drink += row.drink_cents;
      }
    }
  }
  const days = [...daily];
  const peak = Math.max(1, ...days.map(([, day]) => day.food + day.drink));
  const total = days.reduce((sum, [, day]) => sum + day.cents, 0);
  const foodTotal = days.reduce((sum, [, day]) => sum + day.food, 0);
  const drinkTotal = days.reduce((sum, [, day]) => sum + day.drink, 0);
  const count = days.reduce((sum, [, day]) => sum + day.count, 0);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">销售看板</h1>
        <Link href="/inventory" className="rounded-lg border px-4 py-2">库存管理</Link>
      </div>
      <form action="/sales" className="flex flex-wrap items-end gap-4">
        <label className="grid gap-1">开始日期
          <input type="date" name="start" required defaultValue={validDate(start) ? start : defaultStart} className="rounded border px-3 py-2" />
        </label>
        <label className="grid gap-1">结束日期
          <input type="date" name="end" required defaultValue={validDate(end) ? end : today} className="rounded border px-3 py-2" />
        </label>
        <label className="grid gap-1">付款方式
          <select name="payment" defaultValue={payment} className="rounded border px-3 py-2">
            <option value="">全部</option>
            {Object.entries(methods).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
          </select>
        </label>
        <label className="grid gap-1">班次（瑞士时间）
          <select name="shift" defaultValue={shift ?? ""} className="rounded border px-3 py-2">
            <option value="">全部班次</option>
            <option value="1">早班 08:00–14:00</option>
            <option value="2">晚班 14:00–20:00</option>
          </select>
        </label>
        <button className="rounded bg-emerald-700 px-4 py-2 font-semibold text-white">应用筛选</button>
      </form>
      {!validRange ? (
        <p role="alert">请选择有效的开始和结束日期，最多查看 366 天。</p>
      ) : !sales ? (
        <p role="alert">暂时无法读取销售数据，请稍后刷新。</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-4 rounded-lg border p-4">
            <p className="font-semibold">销售额 {money.format(total / 100)}</p>
            <p>订单 {count} 笔</p>
            {!payment && Object.entries(totals).map(([id, cents]) => (
              <p key={id}>{methods[id as keyof typeof methods]} {money.format(cents / 100)}</p>
            ))}
          </div>
          <section className="space-y-2">
            <h2 className="text-lg font-semibold">每日销售额（瑞士时间）</h2>
            {count === 0 ? <p>这个筛选范围内没有订单。</p> : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-4 text-sm">
                  <span><span aria-hidden="true" className="mr-2 inline-block size-3 rounded-sm bg-amber-500" />熟食 {money.format(foodTotal / 100)}</span>
                  <span><span aria-hidden="true" className="mr-2 inline-block size-3 rounded-sm bg-emerald-600" />饮品 {money.format(drinkTotal / 100)}</span>
                </div>
                <div className="overflow-x-auto rounded-lg border p-4">
                  <ul className="flex gap-4">
                    {days.map(([date, day]) => {
                      const detail = date + " · 熟食 " + money.format(day.food / 100) +
                        " · 饮品 " + money.format(day.drink / 100);
                      return (
                        <li key={date} className="min-w-16 flex-1 text-center text-xs tabular-nums" title={detail}>
                          <span className="sr-only">{detail}</span>
                          <div aria-hidden="true" className="mx-auto flex h-44 w-9 flex-col-reverse border-b border-stone-300">
                            <div className="shrink-0 bg-amber-500" style={{ height: (day.food / peak) * 100 + "%" }} />
                            <div className="shrink-0 bg-emerald-600" style={{ height: (day.drink / peak) * 100 + "%" }} />
                          </div>
                          <time aria-hidden="true" dateTime={date} className="mt-2 block">{date.slice(5)}</time>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}

export default function SalesPage({ searchParams }: { searchParams: Filters }) {
  return (
    <Suspense fallback={<p className="p-6">正在加载销售看板…</p>}>
      <OwnerSales searchParams={searchParams} />
    </Suspense>
  );
}
