"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { track } from "@/lib/analytics";
import type { HighlightColor } from "@/lib/bible/highlights";
import { setHighlights as saveHighlights } from "./actions";

/* "절을 누르면 하이라이트할 수 있어요" 안내는 첫 하이라이트 뒤로 숨긴다 (기기에 기억) */
const HINT_KEY = "pt-bible-hl-hint";
const hintListeners = new Set<() => void>();

function readHintDone(): boolean {
  try {
    return window.localStorage.getItem(HINT_KEY) === "done";
  } catch {
    return false;
  }
}

function markHintDone() {
  try {
    window.localStorage.setItem(HINT_KEY, "done");
  } catch {
    /* 저장할 수 없는 환경: 안내가 계속 보일 뿐 */
  }
  hintListeners.forEach((l) => l());
}

function subscribeHint(listener: () => void) {
  hintListeners.add(listener);
  return () => {
    hintListeners.delete(listener);
  };
}

/**
 * 한 장의 하이라이트: 절을 눌러 고르고(selected), 한 색으로 칠하거나 지운다.
 * 화면에 먼저 반영하고 서버에 저장한다. 저장에 실패하면 그 절만 되돌린다.
 * initial 이 null 이면(마이그레이션 0014 전) 기능을 끈다.
 */
export function useVerseHighlights(
  book: number,
  chapter: number,
  initial: Record<number, HighlightColor> | null,
  onError: (message: string) => void,
) {
  const available = initial !== null;
  const [highlights, setHighlights] = useState<Record<number, HighlightColor>>(
    initial ?? {},
  );
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
  const hintDone = useSyncExternalStore(
    subscribeHint,
    readHintDone,
    () => true,
  );

  const toggle = useCallback(
    (verse: number) => {
      if (!available) return;
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(verse)) next.delete(verse);
        else next.add(verse);
        return next;
      });
    },
    [available],
  );

  const clear = useCallback(() => setSelected(new Set()), []);

  // Esc 로 선택 해제
  useEffect(() => {
    if (selected.size === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") clear();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected.size, clear]);

  /** 고른 절을 color 로 칠하기 (null = 지우기) */
  const apply = useCallback(
    (color: HighlightColor | null) => {
      const verses = [...selected].sort((a, b) => a - b);
      if (verses.length === 0) return;
      const before: Record<number, HighlightColor | undefined> = {};
      for (const v of verses) before[v] = highlights[v];

      setHighlights((prev) => {
        const next = { ...prev };
        for (const v of verses) {
          if (color) next[v] = color;
          else delete next[v];
        }
        return next;
      });
      setSelected(new Set());
      if (color) {
        markHintDone();
        track("bible_highlighted");
      }

      void saveHighlights(book, chapter, verses, color).then(
        (res) => {
          if (res.ok) return;
          restore(before);
          onError(res.message);
        },
        () => {
          restore(before);
          onError("저장하지 못했어요. 인터넷 연결을 확인해 주세요.");
        },
      );

      function restore(prevColors: Record<number, HighlightColor | undefined>) {
        setHighlights((cur) => {
          const next = { ...cur };
          for (const [v, c] of Object.entries(prevColors)) {
            if (c) next[Number(v)] = c;
            else delete next[Number(v)];
          }
          return next;
        });
      }
    },
    [book, chapter, highlights, onError, selected],
  );

  /** 고른 절이 모두 같은 색이면 그 색 (색 버튼 눌림 표시용) */
  const selectedColors = [...selected].map((v) => highlights[v]);
  const commonColor =
    selectedColors.length > 0 &&
    selectedColors.every((c) => c && c === selectedColors[0])
      ? (selectedColors[0] ?? null)
      : null;
  const anySelectedHighlighted = selectedColors.some(Boolean);

  return {
    available,
    highlights,
    selected,
    toggle,
    clear,
    apply,
    commonColor,
    anySelectedHighlighted,
    showHint: available && !hintDone,
  };
}

export type VerseHighlights = ReturnType<typeof useVerseHighlights>;
