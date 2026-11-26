import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireProfile } from "@/features/auth/service";
import { getChapterHighlights, getChapterReadState } from "@/services/bible";
import { ChapterReader } from "@/features/bible/ChapterReader";
import { appTodayISO } from "@/lib/date";
import { bookName, chapterUnit } from "@/lib/bible/books";
import { parseChapterParams } from "@/lib/bible/text";

type Params = Promise<{ book: string; chapter: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { book, chapter } = await params;
  const ref = parseChapterParams(book, chapter);
  return {
    title: ref ? `${bookName(ref.book)} ${ref.chapter}${chapterUnit(ref.book)}` : "성경",
    robots: { index: false, follow: false },
  };
}

export const dynamic = "force-dynamic";

/** 성경 읽기 — 한 장 (개역한글). 본문은 정적 파일에서, 읽음 기록은 서버에서. */
export default async function ChapterPage({ params }: { params: Params }) {
  const { book, chapter } = await params;
  const ref = parseChapterParams(book, chapter);
  if (!ref) notFound();

  const profile = await requireProfile();
  const [state, highlights] = await Promise.all([
    getChapterReadState(profile.id, ref.book, ref.chapter, appTodayISO()),
    getChapterHighlights(profile.id, ref.book, ref.chapter),
  ]);

  return (
    <ChapterReader
      // 장이 바뀌면 다시 마운트해 상태(읽음·본문)를 새로 맞춘다
      key={`${ref.book}-${ref.chapter}`}
      book={ref.book}
      chapter={ref.chapter}
      recordAvailable={state.available}
      initialReadToday={state.readToday}
      readBefore={state.readBefore}
      initialHighlights={highlights}
    />
  );
}
