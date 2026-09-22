import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingForm } from "@/features/auth/OnboardingForm";
import { getAuthUser, getMyProfile } from "@/features/auth/service";

export const metadata: Metadata = {
  title: "시작하기",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login");

  // 이미 온보딩 완료한 사용자는 홈으로
  const profile = await getMyProfile();
  if (profile) redirect("/home");

  return (
    <main className="app-shell">
      <div className="flex flex-1 flex-col justify-center px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-ink">
            서로의 기도제목을
            <br />
            기억하고 함께 품어보세요.
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-ink-soft">
            함께 기도할 때 보일 닉네임만 정하면 돼요.
          </p>
        </div>
        <Suspense fallback={<div className="h-40" />}>
          <OnboardingForm />
        </Suspense>
      </div>
    </main>
  );
}
