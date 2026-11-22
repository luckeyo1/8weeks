import { VERSES } from "./verses";
import type { Verse } from "./types";

/** 본문 번역 표기 (퍼블릭 도메인: 성경전서 개역한글판, 대한성서공회) */
export const VERSE_TRANSLATION = "개역한글";

/** "YYYY-MM-DD" → 1970-01-01 기준 일 수 (timezone 무관한 순수 계산) */
function dayNumber(iso: string): number {
  const [y, m, d] = iso.split("-").map((v) => Number.parseInt(v, 10));
  return Math.floor(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1) / 86_400_000);
}

/**
 * 오늘의 말씀. 같은 날에는 모든 사용자에게 같은 구절,
 * 날이 바뀌면 다음 구절 — 목록을 다 돌면 처음부터 다시.
 * 날짜는 서비스 timezone 기준 오늘(appTodayISO)을 넘긴다.
 */
export function pickDailyVerse(
  todayISO: string,
  verses: readonly Verse[] = VERSES,
): Verse {
  const n = verses.length;
  const index = ((dayNumber(todayISO) % n) + n) % n;
  const verse = verses[index];
  if (!verse) throw new Error("오늘의 말씀 목록이 비어 있습니다.");
  return verse;
}

/** "요한복음 3:16" / "빌립보서 4:6-7" */
export function formatVerseRef(verse: Verse): string {
  const range =
    verse.verseStart === verse.verseEnd
      ? `${verse.verseStart}`
      : `${verse.verseStart}-${verse.verseEnd}`;
  return `${verse.book} ${verse.chapter}:${range}`;
}
