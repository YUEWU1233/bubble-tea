"use client";

import { useActionState } from "react";
import { signInStaff } from "./actions";

export default function StaffLoginPage() {
  const [error, action, pending] = useActionState(signInStaff, "");

  return (
    <main className="grid min-h-screen place-items-center bg-stone-50 p-4 text-stone-900">
      <form action={action} className="w-full max-w-sm space-y-4 rounded-xl border border-stone-200 bg-white p-6">
        <h1 className="text-2xl font-bold">店员登录</h1>
        <label className="block text-sm font-medium">
          邮箱
          <input name="email" type="email" autoComplete="username" required
            className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2" />
        </label>
        <label className="block text-sm font-medium">
          密码
          <input name="password" type="password" autoComplete="current-password" required
            className="mt-1 block w-full rounded-lg border border-stone-300 px-3 py-2" />
        </label>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <button disabled={pending} className="w-full rounded-lg bg-emerald-700 px-4 py-2 font-semibold text-white disabled:opacity-50">
          {pending ? "登录中…" : "登录"}
        </button>
      </form>
    </main>
  );
}
