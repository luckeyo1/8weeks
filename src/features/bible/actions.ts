"use server";

import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/features/auth/service";
import { dbBatch, dbRun, newId } from "@/lib/db";
import { isMissingTableError } from "@/services/bible";
import { AppError, toActionError, ok, type ActionResult } from "@/lib/errors";
import { appTodayISO } from "@/lib/date";
import {
  isValidChapter,
  normalizeChapterRefs,
  type ChapterRef,
} from "@/lib/bible/books";
import { isHighlightColor, normalizeVerses } from "@/lib/bible/highlights";

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

/**
 * 읽기 화면의 "이 장 다 읽었어요" / "기록 취소".
 * 오늘(서비스 기준) 읽은 곳에 이 장 하나를 더하거나 뺀다. 다른 장 기록은 건드리지 않는다.
 */
export async function setChapterReadToday(
  book: number,
  chapter: number,
  read: boolean,
): Promise<ActionResult<{ readToday: boolean }>> {
  try {
    const uid = await getAuthUser();
    if (!uid) throw new AppError("UNAUTHENTICATED");
    if (!isValidChapter(book, chapter)) throw new AppError("VALIDATION");

    const today = appTodayISO();
    try {
      if (read) {
        await dbBatch([
          {
            sql: "insert or ignore into bible_chapter_reads (id, user_id, book, chapter, read_date) values (?, ?, ?, ?, ?)",
            params: [newId(), uid, book, chapter, today],
          },
          {
            sql: "insert or ignore into bible_readings (id, user_id, read_date) values (?, ?, ?)",
            params: [newId(), uid, today],
          },
        ]);
      } else {
        await dbRun(
          "delete from bible_chapter_reads where user_id = ? and read_date = ? and book = ? and chapter = ?",
          [uid, today, book, chapter],
        );
        // 오늘 읽은 장이 하나도 남지 않으면 "읽은 날" 표시도 지운다
        await dbRun(
          "delete from bible_readings where user_id = ? and read_date = ? and not exists (select 1 from bible_chapter_reads where user_id = ? and read_date = ?)",
          [uid, today, uid, today],
        );
      }
    } catch (e) {
      if (isMissingTableError(e)) {
        throw new AppError(
          "UNKNOWN",
          "성경 읽기 기록을 준비하고 있어요. 잠시 후 다시 시도해주세요.",
        );
      }
      throw e;
    }

    revalidatePath("/home");
    revalidatePath("/bible");
    return ok({ readToday: read });
  } catch (e) {
    return toActionError(e);
  }
}

/**
 * 하이라이트: 이 장의 여러 절을 한 색으로 칠하거나(color) 지운다(null). 본인 것만 바뀐다.
 * 절 번호·색은 서버에서 다시 검증한다.
 */
export async function setHighlights(
  book: number,
  chapter: number,
  verses: number[],
  color: string | null,
): Promise<ActionResult<{ count: number }>> {
  try {
    const uid = await getAuthUser();
    if (!uid) throw new AppError("UNAUTHENTICATED");
    if (!isValidChapter(book, chapter)) throw new AppError("VALIDATION");
    const list = normalizeVerses(verses);
    if (!list) throw new AppError("VALIDATION");
    if (color !== null && !isHighlightColor(color)) {
      throw new AppError("VALIDATION");
    }

    try {
      await dbBatch(
        list.map((verse) =>
          color === null
            ? {
                sql: "delete from bible_highlights where user_id = ? and book = ? and chapter = ? and verse = ?",
                params: [uid, book, chapter, verse],
              }
            : {
                sql: `insert into bible_highlights (user_id, book, chapter, verse, color) values (?, ?, ?, ?, ?)
                      on conflict(user_id, book, chapter, verse)
                      do update set color = excluded.color, updated_at = datetime('now')`,
                params: [uid, book, chapter, verse, color],
              },
        ),
      );
    } catch (e) {
      if (isMissingTableError(e)) {
        throw new AppError(
          "UNKNOWN",
          "하이라이트를 준비하고 있어요. 잠시 후 다시 시도해주세요.",
        );
      }
      throw e;
    }

    revalidatePath("/bible");
    revalidatePath("/bible/highlights");
    return ok({ count: list.length });
  } catch (e) {
    return toActionError(e);
  }
}
