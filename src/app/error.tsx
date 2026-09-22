"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

/** 렌더/네트워크 오류 시 crash 대신 안내 (명세 80) */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // production 에서는 민감정보 로그 금지 (명세 85). 최소 정보만.
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }, [error]);

  return (
    <main className="app-shell">
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-[15px] font-medium text-ink">
          잠시 문제가 생겼어요.
        </p>
        <p className="text-sm text-ink-soft">잠시 후 다시 시도해주세요.</p>
        <Button variant="secondary" onClick={reset}>
          다시 시도
        </Button>
      </div>
    </main>
  );
}
