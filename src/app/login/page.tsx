import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/features/auth/LoginForm";
import { getAuthUser } from "@/features/auth/service";
import { InviteBanner, inviterNameFor } from "@/features/auth/invite";
import { safeReturnUrl } from "@/lib/returnUrl";

export const metadata: Metadata = {
  title: "로그인",
  robots: { index: false, follow: false },
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [user, sp] = await Promise.all([getAuthUser(), searchParams]);
  const returnUrl = safeReturnUrl(
    typeof sp.returnUrl === "string" ? sp.returnUrl : null,
  );
  // 이미 로그인했다면 돌아갈 곳으로 (로그인 직후 재렌더 때도 LoginForm 과 같은 목적지)
  if (user) redirect(returnUrl);
  const inviterName = await inviterNameFor(returnUrl);

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
            hint="로그인하면 바로 기도제목을 보고 함께 기도할 수 있어요."
          />
        )}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-ink">함께 기도해요</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
            서로의 기도제목을 기억하고 함께 품어보세요.
          </p>
        </div>
        <Suspense fallback={<div className="h-40" />}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
