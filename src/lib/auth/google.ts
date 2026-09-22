import "server-only";

import { requireSecret } from "@/lib/cf";
import { publicEnv } from "@/lib/env";

/**
 * Google OAuth 2.0 (OpenID Connect) 헬퍼.
 * 매직링크(이메일 발송) 없이 "비밀번호 없는 로그인"을 제공한다.
 * id_token 은 Google 토큰 엔드포인트에서 TLS 로 직접 받으므로
 * 서명 재검증 없이 payload 를 신뢰한다(Google 권장).
 */

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

export function redirectUri(): string {
  return `${publicEnv.siteUrl}/auth/callback`;
}

export async function buildAuthUrl(state: string): Promise<string> {
  const clientId = await requireSecret("GOOGLE_CLIENT_ID");
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    access_type: "online",
    prompt: "select_account",
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

export interface GoogleIdentity {
  sub: string;
  email: string | null;
  name: string | null;
  picture: string | null;
}

function decodeJwtPayload(jwt: string): Record<string, unknown> {
  const part = jwt.split(".")[1];
  if (!part) throw new Error("잘못된 id_token");
  const pad = part.length % 4 === 0 ? "" : "=".repeat(4 - (part.length % 4));
  const json = atob(part.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return JSON.parse(json) as Record<string, unknown>;
}

/** authorization code → 사용자 신원 */
export async function exchangeCodeForIdentity(
  code: string,
): Promise<GoogleIdentity> {
  const [clientId, clientSecret] = await Promise.all([
    requireSecret("GOOGLE_CLIENT_ID"),
    requireSecret("GOOGLE_CLIENT_SECRET"),
  ]);

  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) throw new Error("Google 토큰 교환 실패");
  const data = (await res.json()) as { id_token?: string };
  if (!data.id_token) throw new Error("id_token 없음");

  const p = decodeJwtPayload(data.id_token);
  const sub = typeof p.sub === "string" ? p.sub : null;
  if (!sub) throw new Error("Google 계정 식별 실패");

  return {
    sub,
    email: typeof p.email === "string" ? p.email : null,
    name: typeof p.name === "string" ? p.name : null,
    picture: typeof p.picture === "string" ? p.picture : null,
  };
}
