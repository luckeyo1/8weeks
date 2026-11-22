import "server-only";

import { dbAll } from "@/lib/db";
import { weekDatesISO } from "@/lib/date";
import type { BibleReadingWeek } from "@/types/domain";

/** 마이그레이션(0008) 적용 전에도 홈 화면이 깨지지 않도록 테이블 부재는 조용히 처리 */
export function isMissingTableError(e: unknown): boolean {
  return e instanceof Error && /no such table/i.test(e.message);
}

/** 이번 주(일요일 시작) 성경 읽기 기록. 본인 기록만 조회한다. */
export async function getBibleReadingWeek(
  userId: string,
  today: string,
): Promise<BibleReadingWeek> {
  const weekDates = weekDatesISO(today);
  try {
    const rows = await dbAll<{ read_date: string }>(
      "select read_date from bible_readings where user_id = ? and read_date between ? and ?",
      [userId, weekDates[0], weekDates[6]],
    );
    return {
      available: true,
      today,
      weekDates,
      readDates: rows.map((r) => r.read_date),
    };
  } catch (e) {
    if (isMissingTableError(e)) {
      return { available: false, today, weekDates, readDates: [] };
    }
    throw e;
  }
}
