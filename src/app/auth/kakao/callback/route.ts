import { NextResponse, type NextRequest } from "next/server";
import {
  findOrCreateKakaoUser,
  getKakaoConfig,
  linkKakaoToUser,
} from "@/features/auth/kakao";
import { getAuthUser } from "@/features/auth/service";
import {
  KAKAO_OAUTH_COOKIE,
  decodeOAuthState,
  exchangeKakaoCode,
  fetchKakaoProfile,
} from "@/lib/auth/kakao";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { getCfEnv } from "@/lib/cf";
import { publicEnv } from "@/lib/env";
import { safeReturnUrl } from "@/lib/returnUrl";

export const dynamic = "force-dynamic";

/**
 * 카카오 콜백: state 검증 → 코드 교환 → 프로필 → (로그인) 계정 찾기/만들기 + 세션 발급
 *                                              (연결) 현재 계정에 카카오 연결
 * 실패하면 이유를 쿼리로 붙여 로그인/내 정보 화면으로 돌려보낸다(기술 메시지는 노출하지 않음).
 */
export async function GET(request: NextRequest) {
  const origin = publicEnv.siteUrl;
  const sp = request.nextUrl.searchParams;
  const saved = decodeOAuthState(
    request.cookies.get(KAKAO_OAUTH_COOKIE)?.value,
  );

  const go = (path: string) => {
    const res = NextResponse.redirect(`${origin}${path}`);
    res.cookies.set(KAKAO_OAUTH_COOKIE, "", { path: "/auth/kakao", maxAge: 0 });
    return res;
  };

  if (!saved || !sp.get("state") || sp.get("state") !== saved.state) {
    return go("/login?error=kakao_state");
  }
  const returnUrl = safeReturnUrl(saved.returnUrl);
  const isLink = saved.mode === "link";
  const loginAgain = `/login?returnUrl=${encodeURIComponent(returnUrl)}`;

  // 사용자가 동의 화면에서 취소한 경우: 조용히 원래 자리로
  if (sp.get("error")) return go(isLink ? "/profile?kakao=cancel" : loginAgain);

  const code = sp.get("code");
  const cfg = await getKakaoConfig();
  if (!code || !cfg) {
    return go(isLink ? "/profile?kakao=error" : "/login?error=kakao");
  }

  try {
    const token = await exchangeKakaoCode(cfg, code);
    const profile = await fetchKakaoProfile(cfg, token);

    if (isLink) {
      const uid = await getAuthUser();
      if (!uid) return go(`/login?returnUrl=${encodeURIComponent("/profile")}`);
      const result = await linkKakaoToUser(uid, profile);
      return go(`/profile?kakao=${result}`);
    }

    const env = await getCfEnv();
    const secret = env.SESSION_SECRET ?? process.env.SESSION_SECRET;
    if (!secret) return go("/login?error=kakao");

    const user = await findOrCreateKakaoUser(profile);
    const res = go(returnUrl);
    res.cookies.set(
      SESSION_COOKIE,
      await createSessionToken(user.id, secret),
      sessionCookieOptions(origin),
    );
    return res;
  } catch {
    return go(isLink ? "/profile?kakao=error" : "/login?error=kakao");
  }
}
