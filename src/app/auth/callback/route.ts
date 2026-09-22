import { NextResponse, type NextRequest } from "next/server";
import { exchangeCodeForIdentity } from "@/lib/auth/google";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { getCfEnv } from "@/lib/cf";
import { dbRun } from "@/lib/db";
import { publicEnv } from "@/lib/env";

export const dynamic = "force-dynamic";

const OAUTH_COOKIE = "pt_oauth";

function safeReturn(url: string | undefined): string {
  if (url && url.startsWith("/") && !url.startsWith("//")) return url;
  return "/home";
}

/** Google 콜백: code 교환 → 사용자 upsert → 세션 쿠키 발급 → 복귀 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const origin = publicEnv.siteUrl;

  // state(nonce) 검증
  const raw = request.cookies.get(OAUTH_COOKIE)?.value ?? "";
  const [nonce, returnUrlRaw] = raw.split("|");
  if (!code || !state || !nonce || state !== nonce) {
    return NextResponse.redirect(`${origin}/login?error=state`);
  }
  const returnUrl = safeReturn(returnUrlRaw);

  try {
    const identity = await exchangeCodeForIdentity(code);

    // 사용자 upsert (닉네임은 건드리지 않음 → 온보딩 상태 유지)
    await dbRun(
      `insert into users (id, email, profile_image_url)
       values (?, ?, ?)
       on conflict(id) do update set
         email = excluded.email,
         profile_image_url = coalesce(excluded.profile_image_url, users.profile_image_url),
         updated_at = datetime('now')`,
      [identity.sub, identity.email, identity.picture],
    );

    const env = await getCfEnv();
    const secret = env.SESSION_SECRET ?? process.env.SESSION_SECRET;
    if (!secret) return NextResponse.redirect(`${origin}/login?error=config`);

    const token = await createSessionToken(identity.sub, secret);
    const res = NextResponse.redirect(`${origin}${returnUrl}`);
    res.cookies.set(SESSION_COOKIE, token, sessionCookieOptions(origin));
    res.cookies.delete(OAUTH_COOKIE);
    return res;
  } catch {
    return NextResponse.redirect(`${origin}/login?error=auth`);
  }
}
