import "server-only";

/**
 * 서명된(HMAC-SHA256) 상태 없는 세션 토큰.
 * 형식: base64url(payload).base64url(signature)
 * payload = { uid, exp(epoch ms) }
 * Web Crypto 기반 — Workers / Node 22 모두 동작.
 */

export const SESSION_COOKIE = "pt_session";
export const SESSION_TTL_DAYS = 30;

function b64urlFromBytes(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function bytesFromB64url(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

function b64urlFromString(s: string): string {
  return b64urlFromBytes(new TextEncoder().encode(s));
}

function stringFromB64url(s: string): string {
  return new TextDecoder().decode(bytesFromB64url(s));
}

async function hmac(secret: string, message: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return new Uint8Array(sig);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function createSessionToken(
  uid: string,
  secret: string,
  ttlDays: number = SESSION_TTL_DAYS,
): Promise<string> {
  const payload = JSON.stringify({
    uid,
    exp: Date.now() + ttlDays * 86_400_000,
  });
  const encoded = b64urlFromString(payload);
  const sig = b64urlFromBytes(await hmac(secret, encoded));
  return `${encoded}.${sig}`;
}

/** 유효하면 uid 반환, 아니면 null */
export async function verifySessionToken(
  token: string | undefined,
  secret: string,
): Promise<string | null> {
  if (!token) return null;
  const [encoded, sig] = token.split(".");
  if (!encoded || !sig) return null;

  const expected = b64urlFromBytes(await hmac(secret, encoded));
  if (!timingSafeEqual(sig, expected)) return null;

  try {
    const { uid, exp } = JSON.parse(stringFromB64url(encoded)) as {
      uid?: string;
      exp?: number;
    };
    if (!uid || !exp || Date.now() > exp) return null;
    return uid;
  } catch {
    return null;
  }
}

export function sessionCookieOptions(siteUrl: string) {
  return {
    httpOnly: true,
    secure: siteUrl.startsWith("https://"),
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_TTL_DAYS * 86_400,
  };
}
