import { BIBLE_BOOKS, chapterCount, type ChapterRef } from "./books";
import type { Verse } from "./types";

/**
 * 성경 본문 (읽기 화면).
 * 본문: 성경전서 개역한글판 (대한성서공회) — 저작재산권 보호기간 만료(퍼블릭 도메인).
 * 장별 정적 파일: public/bibledata/krv/<book>/<chapter>.json  {"v": ["1절", "2절", ...]}
 * 생성: scripts/bible/gen_chapters.py (본문을 손으로 고치지 않는다 — 동일성유지권)
 */
export const BIBLE_TEXT_SOURCE = "성경전서 개역한글판 (대한성서공회)";

export type ChapterText = { v: string[] };

export function chapterDataUrl(book: number, chapter: number): string {
  return `/bibledata/krv/${book}/${chapter}.json`;
}

export function chapterHref(book: number, chapter: number, verse?: number): string {
  return `/bible/${book}/${chapter}${verse ? `#v${verse}` : ""}`;
}

/** "요한복음" → 43. 없으면 0 */
export function bookNumber(name: string): number {
  return BIBLE_BOOKS.findIndex(([n]) => n === name) + 1;
}

/** 오늘의 말씀 → 그 장 읽기 화면, 그 절로 (책 이름을 못 찾으면 null) */
export function dailyVerseHref(verse: Pick<Verse, "book" | "chapter" | "verseStart">): string | null {
  const n = bookNumber(verse.book);
  return n > 0 ? chapterHref(n, verse.chapter, verse.verseStart) : null;
}

/** 이전 장 (창세기 1장이면 null) */
export function prevChapter({ book, chapter }: ChapterRef): ChapterRef | null {
  if (chapter > 1) return { book, chapter: chapter - 1 };
  if (book > 1) return { book: book - 1, chapter: chapterCount(book - 1) };
  return null;
}

/** 다음 장 (요한계시록 마지막 장이면 null) */
export function nextChapterOrNull({ book, chapter }: ChapterRef): ChapterRef | null {
  if (chapter < chapterCount(book)) return { book, chapter: chapter + 1 };
  if (book < BIBLE_BOOKS.length) return { book: book + 1, chapter: 1 };
  return null;
}

/** URL 조각("1", "23")을 장 위치로. 잘못되면 null */
export function parseChapterParams(book: string, chapter: string): ChapterRef | null {
  if (!/^\d{1,2}$/.test(book) || !/^\d{1,3}$/.test(chapter)) return null;
  const b = Number(book);
  const c = Number(chapter);
  if (b < 1 || b > BIBLE_BOOKS.length || c < 1 || c > chapterCount(b)) return null;
  return { book: b, chapter: c };
}
