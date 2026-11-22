import { BIBLE_BOOKS, PLAN_ENDS_365, PLAN_ENDS_366 } from "./plan-data";

/** 하루 읽을 곳의 한 덩어리 (한 권 안의 연속된 장) */
export type ReadingSegment = { book: string; from: number; to: number };

/** 전체 1189장을 순서대로 펼친 목록 (지연 생성) */
let flat: { book: string; chapter: number }[] | null = null;
function chapters(): { book: string; chapter: number }[] {
  if (!flat) {
    flat = BIBLE_BOOKS.flatMap(([book, count]) =>
      Array.from({ length: count }, (_, i) => ({ book, chapter: i + 1 })),
    );
  }
  return flat;
}

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** "YYYY-MM-DD" → 그해 몇 번째 날(1부터)과 그해 일수 */
export function dayOfYear(iso: string): { day: number; daysInYear: 365 | 366 } {
  const [y, m, d] = iso.split("-").map((v) => Number.parseInt(v, 10));
  const year = y ?? 1970;
  const day =
    Math.round(
      (Date.UTC(year, (m ?? 1) - 1, d ?? 1) - Date.UTC(year, 0, 1)) /
        86_400_000,
    ) + 1;
  return { day, daysInYear: isLeapYear(year) ? 366 : 365 };
}

/** 1년 1독 읽기표의 day 번째 날(1부터) 읽을 곳 */
export function readingForDay(
  day: number,
  daysInYear: 365 | 366,
): ReadingSegment[] {
  const ends = daysInYear === 366 ? PLAN_ENDS_366 : PLAN_ENDS_365;
  const d = Math.min(Math.max(1, day), ends.length);
  const start = d === 1 ? 0 : (ends[d - 2] ?? 0);
  const end = ends[d - 1] ?? start;

  const segments: ReadingSegment[] = [];
  for (const { book, chapter } of chapters().slice(start, end)) {
    const last = segments[segments.length - 1];
    if (last && last.book === book && last.to === chapter - 1) {
      last.to = chapter;
    } else {
      segments.push({ book, from: chapter, to: chapter });
    }
  }
  return segments;
}

/**
 * 오늘 읽을 곳 (달력 기준 1년 1독: 1월 1일 창세기 1장 → 12월 31일 요한계시록 22장).
 * 같은 날에는 모든 사용자에게 같은 범위. 날짜는 서비스 기준 오늘(appTodayISO).
 */
export function todaysReading(todayISO: string): ReadingSegment[] {
  const { day, daysInYear } = dayOfYear(todayISO);
  return readingForDay(day, daysInYear);
}

/** "창세기 1–3장" / "시편 23–25편" / "룻기 4장, 사무엘상 1–2장" */
export function formatReading(segments: ReadingSegment[]): string {
  return segments
    .map(({ book, from, to }) => {
      const unit = book === "시편" ? "편" : "장";
      return from === to
        ? `${book} ${from}${unit}`
        : `${book} ${from}–${to}${unit}`;
    })
    .join(", ");
}
