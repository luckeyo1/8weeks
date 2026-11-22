import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/features/auth/SignupForm";
import { getAuthUser } from "@/features/auth/service";
import { InviteBanner, inviterNameFor } from "@/features/auth/invite";
import { isKakaoEnabled } from "@/features/auth/kakao";
import { KakaoLoginButton, OrDivider } from "@/features/auth/KakaoLoginButton";
import { safeReturnUrl } from "@/lib/returnUrl";

export const metadata: Metadata = {
  title: "가입하기",
  robots: { index: false, follow: false },
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  // 로그인 상태여도 서버에서 redirect 하지 않는다: 가입 직후(쿠키 설정 → 이 페이지 재렌더)
  // 복구 코드 화면과 초대 returnUrl 을 지키기 위해 SignupForm 이 직접 판단한다.
  const [user, sp] = await Promise.all([getAuthUser(), searchParams]);
  const returnUrl = safeReturnUrl(
    typeof sp.returnUrl === "string" ? sp.returnUrl : null,
  );
  const [inviterName, kakao] = await Promise.all([
    inviterNameFor(returnUrl),
    isKakaoEnabled(),
  ]);

  return (
    <main
      className="app-shell bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: "url(/bg-pattern.png)" }}
    >
      <div className="flex flex-1 flex-col justify-center px-6 py-12">
        <Link href="/" className="mb-10 text-sm text-ink-soft">
          ← 처음으로
        </Link>
        {inviterName && (
          <InviteBanner
            inviterName={inviterName}
            hint="가입하면 바로 기도제목을 보고 함께 기도할 수 있어요."
          />
        )}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-ink">
            {inviterName ? (
              <>
                30초면 가입하고
                <br />
                함께 기도할 수 있어요.
              </>
            ) : (
              <>
                서로의 기도제목을
                <br />
                기억하고 함께 품어보세요.
              </>
            )}
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
            {kakao
              ? "카카오로 바로 시작하거나, 이메일 없이 아이디로 가입할 수 있어요."
              : "이메일이나 전화번호 없이 이름·아이디·비밀번호만 있으면 돼요."}
          </p>
        </div>
        {kakao && (
          <>
            <KakaoLoginButton returnUrl={returnUrl} />
            <OrDivider label="또는 아이디로 가입" />
          </>
        )}
        <Suspense fallback={<div className="h-40" />}>
          <SignupForm signedIn={Boolean(user)} />
        </Suspense>
        <p className="mt-5 text-center text-[13px] leading-relaxed text-ink-soft">
          가입하면{" "}
          <Link href="/terms" className="underline underline-offset-2 hover:text-ink">
            이용약관
          </Link>
          과{" "}
          <Link href="/privacy" className="underline underline-offset-2 hover:text-ink">
            개인정보 처리방침
          </Link>
          에 동의하는 것으로 간주돼요.
        </p>
      </div>
    </main>
  );
}
