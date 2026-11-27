"use client";

import { formatKoreanDateWithWeekday } from "@/lib/date";
import type { MiniWindowData } from "@/types/domain";

export type MiniState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "unauthenticated" }
  | { status: "ready"; data: MiniWindowData };

/** 작은 창 안의 링크: 이동은 본 창에서 한다 */
function GoLink({
  href,
  onNavigate,
  children,
}: {
  href: string;
  onNavigate: (href: string) => void;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onNavigate(href);
      }}
      className="inline-flex min-h-[32px] items-center text-[13px] font-semibold text-primary hover:underline"
    >
      {children}
      <span aria-hidden className="ml-0.5">
        ›
      </span>
    </a>
  );
}

/**
 * PC "작은 창" 화면. 기도 제목·내용은 보여 주지 않는다 — 남은 개수, 오늘의 말씀, 내 성경 읽기 위치만.
 */
export function MiniWindowView({
  state,
  onNavigate,
  onRetry,
}: {
  state: MiniState;
  onNavigate: (href: string) => void;
  onRetry: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col gap-3 bg-canvas p-4 text-ink">
      <header className="flex items-baseline justify-between gap-2">
        <p className="text-[15px] font-bold text-ink">기도 동행</p>
        {state.status === "ready" && (
          <p className="truncate text-[12px] text-ink-soft">
            {formatKoreanDateWithWeekday(state.data.today)}
          </p>
        )}
      </header>

      {state.status === "loading" && (
        <p className="text-sm text-ink-soft" aria-busy="true">
          불러오는 중…
        </p>
      )}

      {state.status === "error" && (
        <div className="card flex flex-col items-start gap-2 p-4">
          <p className="text-sm text-ink">불러오지 못했어요.</p>
          <button
            type="button"
            onClick={onRetry}
            className="min-h-[36px] rounded-pill border border-line px-3 text-[13px] text-ink hover:border-primary/40"
          >
            다시 시도
          </button>
        </div>
      )}

      {state.status === "unauthenticated" && (
        <div className="card flex flex-col items-start gap-2 p-4">
          <p className="text-sm text-ink">
            로그인이 풀렸어요. 다시 로그인해 주세요.
          </p>
          <GoLink href="/login" onNavigate={onNavigate}>
            로그인
          </GoLink>
        </div>
      )}

      {state.status === "ready" && (
        <>
          <section
            className="card flex flex-col gap-1.5 p-4"
            aria-labelledby="mini-verse"
          >
            <h2
              id="mini-verse"
              className="text-[12px] font-semibold text-primary"
            >
              오늘의 말씀
            </h2>
            <blockquote className="line-clamp-4 break-keep text-[15px] leading-relaxed text-ink">
              {state.data.verse.text}
            </blockquote>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[12px] text-ink-soft">
                {state.data.verse.ref}
              </p>
              {state.data.verse.href && (
                <GoLink href={state.data.verse.href} onNavigate={onNavigate}>
                  본문 읽기
                </GoLink>
              )}
            </div>
          </section>

          <section
            className="card flex flex-col gap-1 p-4"
            aria-labelledby="mini-prayer"
          >
            <h2
              id="mini-prayer"
              className="text-[12px] font-semibold text-primary"
            >
              오늘 기도
            </h2>
            <p className="text-[14px] text-ink">
              {state.data.prayers.pending > 0
                ? `함께 기도할 제목이 ${state.data.prayers.pending}개 남았어요.`
                : "오늘 기도를 모두 마쳤어요."}
            </p>
            <GoLink href="/home" onNavigate={onNavigate}>
              기도하러 가기
            </GoLink>
          </section>

          {state.data.reading.available && (
            <section
              className="card flex flex-col gap-1 p-4"
              aria-labelledby="mini-reading"
            >
              <h2
                id="mini-reading"
                className="text-[12px] font-semibold text-primary"
              >
                성경 읽기
              </h2>
              <p className="text-[14px] text-ink">
                {state.data.reading.today
                  ? `오늘 ${state.data.reading.today}을 읽었어요.`
                  : "오늘은 아직 기록이 없어요."}
              </p>
              <GoLink
                href={state.data.reading.resume.href}
                onNavigate={onNavigate}
              >
                {state.data.reading.resume.label}
              </GoLink>
            </section>
          )}
        </>
      )}
    </div>
  );
}
