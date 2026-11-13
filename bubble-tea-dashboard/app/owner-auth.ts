import { cookies } from "next/headers";

export const ownerSessionCookie = "pos_owner_session";

export async function isAuthorizedOwner(userId: string, url: string, secret: string) {
  const endpoint = new URL("/rest/v1/pos_owners", url);
  endpoint.searchParams.set("select", "user_id");
  endpoint.searchParams.set("user_id", "eq." + userId);

  const response = await fetch(endpoint, {
    headers: { apikey: secret },
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("Owner authorization lookup failed");
  const rows = await response.json();
  return Array.isArray(rows) && rows.some((row) => row?.user_id === userId);
}

export async function getOwnerSession() {
  const token = (await cookies()).get(ownerSessionCookie)?.value;
  if (!token) return { status: "signed-out" } as const;

  const url = process.env.SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) return { status: "unavailable" } as const;

  try {
    const response = await fetch(new URL("/auth/v1/user", url), {
      headers: { apikey: secret, Authorization: "Bearer " + token },
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (response.status === 401 || response.status === 403) return { status: "signed-out" } as const;
    if (!response.ok) return { status: "unavailable" } as const;

    const user = await response.json();
    if (typeof user.id !== "string" || user.is_anonymous) return { status: "forbidden" } as const;
    if (!await isAuthorizedOwner(user.id, url, secret)) return { status: "forbidden" } as const;
    return { status: "authorized", userId: user.id } as const;
  } catch {
    return { status: "unavailable" } as const;
  }
}

export async function checkOwnerSession() {
  return (await getOwnerSession()).status;
}
