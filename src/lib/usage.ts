import { addDaysISO } from "@/lib/date";
import {
  ANALYTICS_EVENTS,
  ANALYTICS_EVENT_LABELS,
  isAnalyticsEvent,
} from "@/lib/analytics";
import type { UsageEventStat, UsageStats } from "@/types/domain";

export type UsageRow = { day: string; event: string; count: number };

/** 통계를 낼 때 읽는 가장 이른 날 (오늘 포함 14일) */
export function usageSince(today: string): string {
  return addDaysISO(today, -13);
}

function rate(numerator: number, denominator: number): number | null {
  return denominator > 0 ? numerator / denominator : null;
}

/**
 * (날짜, 이벤트, 횟수) 행 → 이벤트별 오늘·최근 7일·그 전 7일 합계.
 * 허용 목록 순서대로, 14일 동안 한 번이라도 있었던 이벤트만.
 */
export function summarizeUsage(rows: UsageRow[], today: string): UsageStats {
  const weekStart = addDaysISO(today, -6);
  const prevStart = addDaysISO(today, -13);
  const sums = new Map<
    string,
    { today: number; last7: number; prev7: number }
  >();
  for (const r of rows) {
    if (!isAnalyticsEvent(r.event) || r.day > today || r.day < prevStart)
      continue;
    const s = sums.get(r.event) ?? { today: 0, last7: 0, prev7: 0 };
    if (r.day >= weekStart) s.last7 += r.count;
    else s.prev7 += r.count;
    if (r.day === today) s.today += r.count;
    sums.set(r.event, s);
  }

  const result: UsageEventStat[] = ANALYTICS_EVENTS.filter((e) =>
    sums.has(e),
  ).map((e) => ({
    event: e,
    label: ANALYTICS_EVENT_LABELS[e],
    ...sums.get(e)!,
  }));
  const last7 = (e: string) => sums.get(e)?.last7 ?? 0;
  return {
    rows: result,
    listenStartRate: rate(
      last7("bible_listen_started"),
      last7("bible_chapter_opened"),
    ),
    listenCompleteRate: rate(
      last7("bible_listen_completed"),
      last7("bible_listen_started"),
    ),
  };
}
