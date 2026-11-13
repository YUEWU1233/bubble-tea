import { Suspense } from "react";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { checkStaffSession } from "../staff-auth";
import { signOutStaff } from "../staff-login/actions";

async function StaffOnly({ children }: { children: ReactNode }) {
  await connection();
  const status = await checkStaffSession();
  if (status === "unavailable") {
    return <p className="p-6">暂时无法验证店员身份，请稍后刷新页面。</p>;
  }
  if (status !== "authorized") redirect("/staff-login");

  return (
    <>
      <header className="border-b border-stone-200 bg-white px-4 py-2 text-stone-900">
        <form action={signOutStaff} className="mx-auto flex max-w-5xl justify-end">
          <button className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm">退出登录</button>
        </form>
      </header>
      {children}
    </>
  );
}

export default function PosLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<p className="p-6">正在验证店员身份…</p>}>
      <StaffOnly>{children}</StaffOnly>
    </Suspense>
  );
}
