import { cn } from "@/lib/cn";

/** 카카오 말풍선 심볼 (형태·비율·색상 고정, 검정) */
export function KakaoSymbol({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={className} fill="#000000">
      <path d="M12 3C6.48 3 2 6.58 2 11c0 2.85 1.86 5.35 4.66 6.77l-.95 3.48c-.08.3.26.54.52.37l4.15-2.74c.53.07 1.07.12 1.62.12 5.52 0 10-3.58 10-8s-4.48-8-10-8z" />
    </svg>
  );
}

/** 카카오 로그인 시작 주소 */
export function kakaoStartHref(
  returnUrl: string,
  mode: "login" | "link" = "login",
) {
  const q = new URLSearchParams({ returnUrl });
  if (mode === "link") q.set("mode", "link");
  return `/auth/kakao?${q.toString()}`;
}

/**
 * 카카오 로그인 버튼 — 카카오 디자인 가이드 준수:
 * 컨테이너 #FEE500, 심볼 #000000, 레이블 #000000 85% "카카오 로그인", radius 12px.
 * OAuth 시작 라우트로 전체 이동해야 하므로 next/link 가 아닌 <a> 를 쓴다
 * (Link 프리페치가 state 쿠키를 덮어쓰지 않게).
 */
export function KakaoLoginButton({
  returnUrl = "/home",
  className,
}: {
  returnUrl?: string;
  className?: string;
}) {
  return (
    <a
      href={kakaoStartHref(returnUrl)}
      className={cn(
        "flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[12px] bg-[#FEE500] px-5 text-base font-semibold text-black/85 transition-[filter] hover:brightness-95",
        className,
      )}
    >
      <KakaoSymbol className="h-5 w-5" />
      카카오 로그인
    </a>
  );
}

/** 카카오 버튼과 아이디 폼 사이 구분선 */
export function OrDivider({ label }: { label: string }) {
  return (
    <div className="my-5 flex items-center gap-3 text-[13px] text-ink-soft">
      <span className="h-px flex-1 bg-line" />
      {label}
      <span className="h-px flex-1 bg-line" />
    </div>
  );
}
