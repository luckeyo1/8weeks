"use server";

import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/features/auth/service";
import { dbBatch, newId } from "@/lib/db";
import { AppError, toActionError, ok, type ActionResult } from "@/lib/errors";
import { appTodayISO } from "@/lib/date";
import { normalizeChapterRefs, type ChapterRef } from "@/lib/bible/books";

/**
 * 오늘 읽은 곳 저장. 오늘 기록을 통째로 바꾼다(빈 목록이면 오늘 기록 삭제).
 * - 날짜는 클라이언트가 아니라 서버의 서비스 기준 오늘로 기록한다.
 * - 장 목록은 서버에서 다시 검증한다(66권·장 범위·개수 제한).
 * - "읽은 날"(bible_readings)도 같은 트랜잭션에서 함께 맞춘다.
 */
export async function saveTodayReading(
  chapters: ChapterRef[],
): Promise<ActionResult<{ count: number }>> {
  try {
    const uid = await getAuthUser();
    if (!uid) throw new AppError("UNAUTHENTICATED");

    const refs = normalizeChapterRefs(chapters);
    if (!refs) throw new AppError("VALIDATION");

    const today = appTodayISO();
    await dbBatch([
      {
        sql: "delete from bible_chapter_reads where user_id = ? and read_date = ?",
        params: [uid, today],
      },
      ...refs.map((r) => ({
        sql: "insert into bible_chapter_reads (id, user_id, book, chapter, read_date) values (?, ?, ?, ?, ?)",
        params: [newId(), uid, r.book, r.chapter, today],
      })),
      refs.length > 0
        ? {
            sql: "insert or ignore into bible_readings (id, user_id, read_date) values (?, ?, ?)",
            params: [newId(), uid, today],
          }
        : {
            sql: "delete from bible_readings where user_id = ? and read_date = ?",
            params: [uid, today],
          },
    ]);

    revalidatePath("/home");
    revalidatePath("/bible");
    return ok({ count: refs.length });
  } catch (e) {
    return toActionError(e);
  }
}
