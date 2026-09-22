import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth(Google) / 매직링크 콜백 (명세 4/14).
 * 세션 교환 후 returnUrl(next) 로 복귀. next 는 내부 경로만 허용(open redirect 방지).
 */
function safeNext(next: string | null): string {
  if (!next) return "/home";
  // 반드시 "/" 로 시작하고 "//" 가 아닌 내부 경로만
  if (next.startsWith("/") && !next.startsWith("//")) return next;
  return "/home";
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNext(searchParams.get("next") ?? searchParams.get("returnUrl"));

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  // 실패 시 로그인 화면으로 (안내 메시지)
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
