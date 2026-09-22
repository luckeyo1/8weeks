import { NextResponse, type NextRequest } from "next/server";
import { buildAuthUrl } from "@/lib/auth/google";
import { publicEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

const OAUTH_COOKIE = "pt_oauth";

function safeReturn(url: string | null): string {
  if (url && url.startsWith("/") && !url.startsWith("//")) return url;
  return "/home";
}

/** Google 로그인 시작: state 쿠키 설정 후 동의 화면으로 리다이렉트 */
export async function GET(request: NextRequest) {
  const returnUrl = safeReturn(request.nextUrl.searchParams.get("returnUrl"));
  const nonce = crypto.randomUUID();

  let target: string;
  try {
    target = await buildAuthUrl(nonce);
  } catch {
    return NextResponse.redirect(`${publicEnv.siteUrl}/login?error=config`);
  }

  const res = NextResponse.redirect(target);
  res.cookies.set(OAUTH_COOKIE, `${nonce}|${returnUrl}`, {
    httpOnly: true,
    secure: publicEnv.siteUrl.startsWith("https://"),
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10분
  });
  return res;
}
