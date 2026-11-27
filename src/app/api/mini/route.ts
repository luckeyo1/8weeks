import { NextResponse } from "next/server";
import { getAuthUser } from "@/features/auth/service";
import { appTodayISO } from "@/lib/date";
import { formatVerseRef, pickDailyVerse } from "@/lib/bible/daily";
import {
  bookName,
  chapterUnit,
  formatChapters,
  fromChapterKey,
  nextChapter,
} from "@/lib/bible/books";
import { chapterHref, dailyVerseHref } from "@/lib/bible/text";
import { getBibleReadingState } from "@/services/bible";
import { countPendingPrayers } from "@/services/reminder";
import type { MiniWindowData } from "@/types/domain";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "private, no-store" };

/**
 * PC "작은 창" 데이터 (src/features/mini). 로그인한 본인 것만.
 * 기도 제목·내용은 넣지 않는다 — 남은 개수, 공개된 오늘의 말씀, 내 성경 읽기 위치만.
 */
export async function GET(): Promise<Response> {
  const uid = await getAuthUser();
  if (!uid) {
    return NextResponse.json(
      { error: "unauthenticated" },
      { status: 401, headers: NO_STORE },
    );
  }

  const today = appTodayISO();
  const verse = pickDailyVerse(today);
  const [pending, reading] = await Promise.all([
    countPendingPrayers(uid, today),
    getBibleReadingState(uid, today),
  ]);

  const lastRead = reading.lastRead ? fromChapterKey(reading.lastRead) : null;
  const resume = lastRead ? nextChapter(lastRead) : { book: 1, chapter: 1 };
  const todayText = formatChapters(reading.todayKeys.map(fromChapterKey));

  const data: MiniWindowData = {
    today,
    verse: {
      text: verse.text,
      ref: formatVerseRef(verse),
      href: dailyVerseHref(verse),
    },
    prayers: { pending },
    reading: {
      available: reading.available,
      today: todayText || null,
      resume: {
        href: chapterHref(resume.book, resume.chapter),
        label: `${bookName(resume.book)} ${resume.chapter}${chapterUnit(resume.book)} ${lastRead ? "이어 읽기" : "읽기"}`,
      },
    },
  };
  return NextResponse.json(data, { headers: NO_STORE });
}
