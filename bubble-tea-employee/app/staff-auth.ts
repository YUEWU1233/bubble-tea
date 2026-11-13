import { cookies } from "next/headers";

export const staffSessionCookie = "pos_staff_session";

export async function isAuthorizedStaff(userId: string, url: string, secret: string) {
  const endpoint = new URL("/rest/v1/pos_staff", url);
  endpoint.searchParams.set("select", "user_id");
  endpoint.searchParams.set("user_id", "eq." + userId);

  const response = await fetch(endpoint, {
    headers: { apikey: secret },
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("Staff authorization lookup failed");
  const rows = await response.json();
  return Array.isArray(rows) && rows.some((row) => row?.user_id === userId);
}

export async function checkStaffSession() {
  const token = (await cookies()).get(staffSessionCookie)?.value;
  if (!token) return "signed-out";

  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) return "unavailable";

  try {
    const response = await fetch(new URL("/auth/v1/user", url), {
      headers: { apikey: secret, Authorization: "Bearer " + token },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (response.status === 401 || response.status === 403) return "signed-out";
    if (!response.ok) return "unavailable";

    const user = await response.json();
    if (typeof user.id !== "string" || user.is_anonymous) return "forbidden";
    return await isAuthorizedStaff(user.id, url, secret) ? "authorized" : "forbidden";
  } catch {
    return "unavailable";
  }
}
