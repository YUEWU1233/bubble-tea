"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isAuthorizedOwner, ownerSessionCookie } from "../owner-auth";

export async function signInOwner(_previousError: string, form: FormData) {
  const email = form.get("email");
  const password = form.get("password");
  if (typeof email !== "string" || !email.trim() || typeof password !== "string" || !password) {
    return "请输入邮箱和密码。";
  }

  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) return "登录服务尚未配置。";

  try {
    const response = await fetch(new URL("/auth/v1/token?grant_type=password", url), {
      method: "POST",
      headers: { apikey: secret, "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), password }),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (response.status === 429) return "尝试次数过多，请稍后再试。";
    if (response.status === 400 || response.status === 401) return "登录失败，请检查邮箱、密码和账号确认状态。";
    if (!response.ok) return "登录服务暂不可用，请稍后再试。";

    const session = await response.json();
    if (typeof session.access_token !== "string" || !Number.isInteger(session.expires_in) ||
        session.expires_in <= 0 || typeof session.user?.id !== "string") {
      return "登录服务暂不可用，请稍后再试。";
    }
    if (!await isAuthorizedOwner(session.user.id, url, secret)) return "这个账号没有店主权限。";

    (await cookies()).set(ownerSessionCookie, session.access_token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: session.expires_in,
    });
  } catch {
    return "登录服务暂不可用，请稍后再试。";
  }
  redirect("/inventory");
}

export async function signOutOwner() {
  (await cookies()).delete(ownerSessionCookie);
  redirect("/owner-login");
}
