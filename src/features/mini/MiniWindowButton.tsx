"use client";

import { useMiniWindow } from "./MiniWindowProvider";

/** 홈: "작은 창으로 띄우기" — PC 크롬·엣지(Document Picture-in-Picture 지원)에서만 보인다 */
export function MiniWindowButton() {
  const mini = useMiniWindow();
  if (!mini?.supported) return null;
  return (
    <button
      type="button"
      onClick={mini.isOpen ? mini.close : mini.open}
      className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-pill border border-line bg-surface px-3 text-[13px] font-medium text-ink hover:border-primary/40"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect
          x="3"
          y="4"
          width="18"
          height="16"
          rx="2"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <rect x="12" y="12" width="7" height="6" rx="1" fill="currentColor" />
      </svg>
      {mini.isOpen ? "작은 창 닫기" : "작은 창으로 띄우기"}
    </button>
  );
}
