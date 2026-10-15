import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RecoverForm } from "@/features/auth/RecoverForm";
import { getAuthUser } from "@/features/auth/service";

export const metadata: Metadata = {
  title: "비밀번호 재설정",
  robots: { index: false, follow: false },
};

export default async function RecoverPage() {
  const user = await getAuthUser();
  if (user) redirect("/home");

  return (
    <main className="app-shell">
      <div className="flex flex-1 flex-col justify-center px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-ink">비밀번호 재설정</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
            아이디와 복구 코드로 새 비밀번호를 설정할 수 있어요.
          </p>
        </div>
        <RecoverForm />
      </div>
    </main>
  );
}
