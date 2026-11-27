import { addDaysISO } from "@/lib/date";

type DayCount = { date: string; n: number };

/**
 * 날짜별 "읽은 사람 수"·"기록된 장 수"를 오늘 포함 최근 days 일로 합친다.
 * 빠진 날은 0, 범위 밖 날짜는 버리고, 오래된 날부터 정렬한다.
 */
export function dailySeries(
  readers: readonly DayCount[],
  chapters: readonly DayCount[],
  today: string,
  days = 14,
): { date: string; readers: number; chapters: number }[] {
  const r = new Map(readers.map((x) => [x.date, x.n]));
  const c = new Map(chapters.map((x) => [x.date, x.n]));
  return Array.from({ length: days }, (_, i) => {
    const date = addDaysISO(today, i - (days - 1));
    return { date, readers: r.get(date) ?? 0, chapters: c.get(date) ?? 0 };
  });
}
