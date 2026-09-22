"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";

function safeReturn(url: string | null): string {
  if (url && url.startsWith("/") && !url.startsWith("//")) return url;
  return "/home";
}

export function LoginForm() {
  const params = useSearchParams();
  const returnUrl = safeReturn(params.get("returnUrl"));
  const hasError = params.get("error");

  const googleHref = `/auth/google?returnUrl=${encodeURIComponent(returnUrl)}`;

  return (
    <div className="flex flex-col gap-5">
      {hasError && (
        <p className="rounded-card bg-red-50 px-4 py-3 text-sm text-red-600">
          로그인이 완료되지 않았어요. 다시 시도해주세요.
        </p>
      )}

      {/* 링크 기반: 서버에서 Google 동의 화면으로 리다이렉트 */}
      <a href={googleHref} className="block">
        <Button variant="secondary" size="lg" fullWidth>
          Google로 계속하기
        </Button>
      </a>

      <p className="text-center text-xs leading-relaxed text-ink-soft/80">
        비밀번호 없이 Google 계정으로 로그인해요.
      </p>
    </div>
  );
}
