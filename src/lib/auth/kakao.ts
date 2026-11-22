/**
 * 카카오 로그인 (REST API, OAuth 2.0 인가 코드 방식).
 * https://developers.kakao.com/docs/latest/ko/kakaologin/rest-api
 *
 * - 순수 함수(URL 생성, 응답 파싱, state 쿠키 인코딩)와 네트워크 호출을 나눠 두어 단위 테스트한다.
 * - 액세스 토큰은 프로필 조회에만 쓰고 저장하지 않는다. 받는 정보는 회원번호와 닉네임뿐.
 */

export const KAKAO_AUTH_BASE = "https://kauth.kakao.com";
export const KAKAO_API_BASE = "https://kapi.kakao.com";
export const KAKAO_OAUTH_COOKIE = "pt_kakao_oauth";
export const KAKAO_NICKNAME_MAX = 20;

export type KakaoConfig = {
  clientId: string; // REST API 키
  clientSecret: string | null; // [보안] Client Secret 을 켠 경우
  adminKey: string | null; // 회원 탈퇴 시 연결 끊기(선택)
  redirectUri: string;
  authBase: string;
  apiBase: string;
};

export type KakaoProfile = { id: string; nickname: string | null };

export type KakaoOAuthState = {
  state: string;
  mode: "login" | "link";
  returnUrl: string;
};

/** 인가 코드 요청 URL */
export function buildKakaoAuthUrl(cfg: KakaoConfig, state: string): string {
  const url = new URL("/oauth/authorize", cfg.authBase);
  url.searchParams.set("client_id", cfg.clientId);
  url.searchParams.set("redirect_uri", cfg.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  return url.toString();
}

/** 토큰 요청 본문 (application/x-www-form-urlencoded) */
export function buildTokenBody(
  cfg: KakaoConfig,
  code: string,
): URLSearchParams {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id: cfg.clientId,
    redirect_uri: cfg.redirectUri,
    code,
  });
  if (cfg.clientSecret) body.set("client_secret", cfg.clientSecret);
  return body;
}

/** /v2/user/me 응답 → 회원번호 + 닉네임 (닉네임 동의가 없으면 null) */
export function parseKakaoProfile(json: unknown): KakaoProfile | null {
  if (typeof json !== "object" || json === null) return null;
  const data = json as {
    id?: unknown;
    kakao_account?: { profile?: { nickname?: unknown } };
    properties?: { nickname?: unknown };
  };
  if (typeof data.id !== "number" && typeof data.id !== "string") return null;
  const id = String(data.id);
  if (!/^\d+$/.test(id)) return null;
  const raw =
    data.kakao_account?.profile?.nickname ?? data.properties?.nickname ?? null;
  const nickname =
    typeof raw === "string" && raw.trim()
      ? raw.trim().slice(0, KAKAO_NICKNAME_MAX)
      : null;
  return { id, nickname };
}

/** state 쿠키 값 (사용자 브라우저에만 저장, httpOnly) */
export function encodeOAuthState(s: KakaoOAuthState): string {
  return encodeURIComponent(JSON.stringify(s));
}

export function decodeOAuthState(
  raw: string | undefined,
): KakaoOAuthState | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(decodeURIComponent(raw)) as Partial<KakaoOAuthState>;
    if (
      typeof v.state !== "string" ||
      v.state.length < 16 ||
      (v.mode !== "login" && v.mode !== "link") ||
      typeof v.returnUrl !== "string"
    ) {
      return null;
    }
    return { state: v.state, mode: v.mode, returnUrl: v.returnUrl };
  } catch {
    return null;
  }
}

/** 추측 불가능한 state (CSRF 방지) */
export function newOAuthState(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** 인가 코드 → 액세스 토큰 */
export async function exchangeKakaoCode(
  cfg: KakaoConfig,
  code: string,
): Promise<string> {
  const res = await fetch(new URL("/oauth/token", cfg.authBase), {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body: buildTokenBody(cfg, code),
  });
  const json = (await res.json().catch(() => null)) as {
    access_token?: unknown;
  } | null;
  if (!res.ok || typeof json?.access_token !== "string") {
    throw new Error(`kakao token exchange failed: ${res.status}`);
  }
  return json.access_token;
}

/** 액세스 토큰 → 프로필 */
export async function fetchKakaoProfile(
  cfg: KakaoConfig,
  accessToken: string,
): Promise<KakaoProfile> {
  const res = await fetch(new URL("/v2/user/me", cfg.apiBase), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const profile = parseKakaoProfile(await res.json().catch(() => null));
  if (!res.ok || !profile) {
    throw new Error(`kakao profile failed: ${res.status}`);
  }
  return profile;
}

/** 회원 탈퇴 시 카카오 연결 끊기 (어드민 키가 있을 때만, 실패해도 탈퇴는 진행) */
export async function unlinkKakaoUser(
  cfg: KakaoConfig,
  kakaoId: string,
): Promise<boolean> {
  if (!cfg.adminKey) return false;
  try {
    const res = await fetch(new URL("/v1/user/unlink", cfg.apiBase), {
      method: "POST",
      headers: {
        Authorization: `KakaoAK ${cfg.adminKey}`,
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
      body: new URLSearchParams({
        target_id_type: "user_id",
        target_id: kakaoId,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
