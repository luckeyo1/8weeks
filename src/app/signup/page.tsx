import { Suspense } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignupForm } from "@/features/auth/SignupForm";
import { getAuthUser } from "@/features/auth/service";

export const metadata: Metadata = {
  title: "가입하기",
  robots: { index: false, follow: false },
};

export default async function SignupPage() {
  const user = await getAuthUser();
  if (user) redirect("/home");

  return (
    <main className="app-shell">
      <div className="flex flex-1 flex-col justify-center px-6 py-12">
        <Link href="/" className="mb-10 text-sm text-ink-soft">
          ← 처음으로
        </Link>
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-ink">
            서로의 기도제목을
            <br />
            기억하고 함께 품어보세요.
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
            간단히 가입하고 시작할 수 있어요.
          </p>
        </div>
        <Suspense fallback={<div className="h-40" />}>
          <SignupForm />
        </Suspense>
      </div>
    </main>
  );
}
