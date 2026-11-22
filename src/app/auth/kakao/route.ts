import { NextResponse, type NextRequest } from "next/server";
import { getKakaoConfig } from "@/features/auth/kakao";
import {
  KAKAO_OAUTH_COOKIE,
  buildKakaoAuthUrl,
  encodeOAuthState,
  newOAuthState,
} from "@/lib/auth/kakao";
import { publicEnv } from "@/lib/env";
import { safeReturnUrl } from "@/lib/returnUrl";

export const dynamic = "force-dynamic";

/**
 * 카카오 로그인 시작: state(CSRF 방지)·모드·돌아갈 곳을 httpOnly 쿠키에 담고 카카오 동의 화면으로.
 * ?mode=link 는 로그인한 사용자가 기존 계정에 카카오를 연결할 때.
 */
export async function GET(request: NextRequest) {
  const origin = publicEnv.siteUrl;
  const cfg = await getKakaoConfig();
  if (!cfg) return NextResponse.redirect(`${origin}/login?error=kakao_config`);

  const sp = request.nextUrl.searchParams;
  const returnUrl = safeReturnUrl(sp.get("returnUrl"));
  const mode = sp.get("mode") === "link" ? "link" : "login";
  const state = newOAuthState();

  const res = NextResponse.redirect(buildKakaoAuthUrl(cfg, state));
  res.cookies.set(
    KAKAO_OAUTH_COOKIE,
    encodeOAuthState({ state, mode, returnUrl }),
    {
      httpOnly: true,
      secure: origin.startsWith("https://"),
      sameSite: "lax", // 카카오에서 돌아오는 최상위 GET 이동에는 전송된다
      path: "/auth/kakao",
      maxAge: 600, // 10분
    },
  );
  return res;
}
