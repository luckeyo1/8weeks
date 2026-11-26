"use client";

import { cn } from "@/lib/cn";
import { HIGHLIGHT_COLORS, HIGHLIGHT_STYLE } from "@/lib/bible/highlights";
import type { VerseHighlights } from "./useVerseHighlights";

/**
 * 절을 고르면 하단 메뉴 바로 위에 뜨는 색 고르기 막대 (듣기 막대와 같은 자리).
 * 색을 누르면 바로 칠하고 선택이 풀린다.
 */
export function HighlightBar({ hl }: { hl: VerseHighlights }) {
  return (
    <div
      role="region"
      aria-label="하이라이트"
      className="fixed inset-x-0 z-40 mx-auto max-w-app bg-gradient-to-t from-canvas via-canvas to-transparent px-3 pb-2 pt-3"
      style={{ bottom: "calc(62px + env(safe-area-inset-bottom))" }}
    >
      <div className="card flex flex-col gap-2 px-3 pb-3 pt-2 shadow-pop">
        <div className="flex items-center justify-between">
          <p className="text-[14px] font-semibold text-ink" aria-live="polite">
            절 {hl.selected.size}개 선택
          </p>
          <button
            type="button"
            onClick={hl.clear}
            aria-label="선택 해제"
            className="-mr-1 flex h-9 w-9 items-center justify-center rounded-full text-ink-soft hover:bg-line/50 hover:text-ink"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden
            >
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex flex-1 items-center gap-2"
            role="group"
            aria-label="색"
          >
            {HIGHLIGHT_COLORS.map((c) => {
              const active = hl.commonColor === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => hl.apply(c)}
                  aria-label={`${HIGHLIGHT_STYLE[c].name}으로 표시`}
                  aria-pressed={active}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full ring-offset-2 transition-shadow",
                    HIGHLIGHT_STYLE[c].swatch,
                    active ? "ring-2 ring-ink" : "hover:ring-2 hover:ring-line",
                  )}
                >
                  {active && (
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden
                    >
                      <path
                        d="M5 12.5l4.5 4.5L19 7.5"
                        stroke="#222"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
          {hl.anySelectedHighlighted && (
            <button
              type="button"
              onClick={() => hl.apply(null)}
              className="min-h-[40px] shrink-0 rounded-pill border border-line px-3.5 text-[14px] text-ink hover:border-primary/40"
            >
              지우기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
