import "server-only";

import { dbAll, dbRun } from "@/lib/db";
import { appTodayISO } from "@/lib/date";
import type { AnalyticsEvent } from "@/lib/analytics";
import { summarizeUsage, usageSince, type UsageRow } from "@/lib/usage";
import { isMissingTableError } from "@/services/bible";
import type { UsageStats } from "@/types/domain";

/**
 * 이용 통계 (migrations/0013). 누가 썼는지는 저장하지 않고 (날짜, 이벤트) 합계만 올린다.
 * 테이블이 아직 없으면(마이그레이션 전) 조용히 건너뛴다 — 앱 동작에 영향 없음.
 */
export async function recordUsageEvent(event: AnalyticsEvent): Promise<void> {
  try {
    await dbRun(
      `insert into usage_events (day, event, count) values (?, ?, 1)
       on conflict(day, event) do update set count = count + 1`,
      [appTodayISO(), event],
    );
  } catch (e) {
    if (isMissingTableError(e)) return;
    throw e;
  }
}

/** 관리자 › 이용 통계. 테이블이 없으면 null (화면에서 마이그레이션 안내) */
export async function getUsageStats(): Promise<UsageStats | null> {
  const today = appTodayISO();
  try {
    const rows = await dbAll<UsageRow>(
      "select day, event, count from usage_events where day >= ?",
      [usageSince(today)],
    );
    return summarizeUsage(rows, today);
  } catch (e) {
    if (isMissingTableError(e)) return null;
    throw e;
  }
}
