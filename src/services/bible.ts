import "server-only";

import { dbAll, dbFirst } from "@/lib/db";
import { weekDatesISO } from "@/lib/date";
import { chapterKey } from "@/lib/bible/books";
import type { BibleReadingState } from "@/types/domain";

/** 마이그레이션(0008/0009) 적용 전에도 화면이 깨지지 않도록 테이블 부재는 조용히 처리 */
export function isMissingTableError(e: unknown): boolean {
  return e instanceof Error && /no such table/i.test(e.message);
}

type ChapterRow = { book: number; chapter: number };
const toKey = (r: ChapterRow) => chapterKey(r.book, r.chapter);

/** 지금까지 한 번이라도 읽은 장 (통독 현황). 테이블이 없으면 null. */
export async function getReadChapterKeys(
  userId: string,
): Promise<number[] | null> {
  try {
    const rows = await dbAll<ChapterRow>(
      "select distinct book, chapter from bible_chapter_reads where user_id = ?",
      [userId],
    );
    return rows.map(toKey);
  } catch (e) {
    if (isMissingTableError(e)) return null;
    throw e;
  }
}

/** 홈 카드용: 이번 주 읽은 날 + 오늘 읽은 장 + 통독 현황 + 마지막 기록. 본인 기록만. */
export async function getBibleReadingState(
  userId: string,
  today: string,
): Promise<BibleReadingState> {
  const weekDates = weekDatesISO(today);
  const empty: BibleReadingState = {
    available: false,
    today,
    weekDates,
    readDates: [],
    todayKeys: [],
    readKeys: [],
    lastRead: null,
  };
  try {
    const [week, todayRows, readKeys, last] = await Promise.all([
      dbAll<{ read_date: string }>(
        "select read_date from bible_readings where user_id = ? and read_date between ? and ?",
        [userId, weekDates[0], weekDates[6]],
      ),
      dbAll<ChapterRow>(
        "select book, chapter from bible_chapter_reads where user_id = ? and read_date = ?",
        [userId, today],
      ),
      getReadChapterKeys(userId),
      dbFirst<ChapterRow>(
        "select book, chapter from bible_chapter_reads where user_id = ? order by read_date desc, book desc, chapter desc limit 1",
        [userId],
      ),
    ]);
    if (readKeys === null) return empty;
    return {
      available: true,
      today,
      weekDates,
      readDates: week.map((r) => r.read_date),
      todayKeys: todayRows.map(toKey),
      readKeys,
      lastRead: last ? toKey(last) : null,
    };
  } catch (e) {
    if (isMissingTableError(e)) return empty;
    throw e;
  }
}
