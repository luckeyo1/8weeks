/**
 * 성경 66권: [책 이름, 장 수] (창세기 → 요한계시록, 개역한글 기준).
 * 책 번호는 이 배열의 순서 + 1 (창세기 1 … 요한계시록 66) — DB 에 이 번호로 저장한다.
 */
export const BIBLE_BOOKS: readonly (readonly [string, number])[] = [
  ["창세기", 50],
  ["출애굽기", 40],
  ["레위기", 27],
  ["민수기", 36],
  ["신명기", 34],
  ["여호수아", 24],
  ["사사기", 21],
  ["룻기", 4],
  ["사무엘상", 31],
  ["사무엘하", 24],
  ["열왕기상", 22],
  ["열왕기하", 25],
  ["역대상", 29],
  ["역대하", 36],
  ["에스라", 10],
  ["느헤미야", 13],
  ["에스더", 10],
  ["욥기", 42],
  ["시편", 150],
  ["잠언", 31],
  ["전도서", 12],
  ["아가", 8],
  ["이사야", 66],
  ["예레미야", 52],
  ["예레미야애가", 5],
  ["에스겔", 48],
  ["다니엘", 12],
  ["호세아", 14],
  ["요엘", 3],
  ["아모스", 9],
  ["오바댜", 1],
  ["요나", 4],
  ["미가", 7],
  ["나훔", 3],
  ["하박국", 3],
  ["스바냐", 3],
  ["학개", 2],
  ["스가랴", 14],
  ["말라기", 4],
  ["마태복음", 28],
  ["마가복음", 16],
  ["누가복음", 24],
  ["요한복음", 21],
  ["사도행전", 28],
  ["로마서", 16],
  ["고린도전서", 16],
  ["고린도후서", 13],
  ["갈라디아서", 6],
  ["에베소서", 6],
  ["빌립보서", 4],
  ["골로새서", 4],
  ["데살로니가전서", 5],
  ["데살로니가후서", 3],
  ["디모데전서", 6],
  ["디모데후서", 4],
  ["디도서", 3],
  ["빌레몬서", 1],
  ["히브리서", 13],
  ["야고보서", 5],
  ["베드로전서", 5],
  ["베드로후서", 3],
  ["요한일서", 5],
  ["요한이서", 1],
  ["요한삼서", 1],
  ["유다서", 1],
  ["요한계시록", 22],
];

/** 구약 권수 (창세기~말라기) */
export const OLD_TESTAMENT_BOOKS = 39;

/** 전체 장 수 */
export const TOTAL_CHAPTERS = BIBLE_BOOKS.reduce((n, [, c]) => n + c, 0);

/** 한 장 (book: 1~66) */
export type ChapterRef = { book: number; chapter: number };

/** 하루에 기록할 수 있는 최대 장 수 (시편 전체 150편 + 여유) */
export const MAX_CHAPTERS_PER_DAY = 300;

export function bookName(book: number): string {
  return BIBLE_BOOKS[book - 1]?.[0] ?? "";
}

export function chapterCount(book: number): number {
  return BIBLE_BOOKS[book - 1]?.[1] ?? 0;
}

/** 시편은 "편", 나머지는 "장" */
export function chapterUnit(book: number): string {
  return bookName(book) === "시편" ? "편" : "장";
}

export function isValidChapter(book: number, chapter: number): boolean {
  return (
    Number.isInteger(book) &&
    Number.isInteger(chapter) &&
    chapter >= 1 &&
    chapter <= chapterCount(book)
  );
}

/** 집합 키. 정렬하면 성경 순서가 된다. */
export function chapterKey(book: number, chapter: number): number {
  return book * 1000 + chapter;
}

export function fromChapterKey(key: number): ChapterRef {
  return { book: Math.floor(key / 1000), chapter: key % 1000 };
}

/**
 * 입력 검증 + 중복 제거 + 성경 순서 정렬. 잘못된 장이 하나라도 있거나
 * 너무 많으면 null (서버 액션에서 신뢰할 수 없는 입력을 거른다).
 */
export function normalizeChapterRefs(input: unknown): ChapterRef[] | null {
  if (!Array.isArray(input) || input.length > MAX_CHAPTERS_PER_DAY) return null;
  const keys = new Set<number>();
  for (const item of input) {
    if (typeof item !== "object" || item === null) return null;
    const { book, chapter } = item as Record<string, unknown>;
    if (typeof book !== "number" || typeof chapter !== "number") return null;
    if (!isValidChapter(book, chapter)) return null;
    keys.add(chapterKey(book, chapter));
  }
  return [...keys].sort((a, b) => a - b).map(fromChapterKey);
}

/** 다음 장 (책 끝이면 다음 책 1장, 요한계시록 22장 다음은 창세기 1장) */
export function nextChapter({ book, chapter }: ChapterRef): ChapterRef {
  if (chapter < chapterCount(book)) return { book, chapter: chapter + 1 };
  return book < BIBLE_BOOKS.length
    ? { book: book + 1, chapter: 1 }
    : { book: 1, chapter: 1 };
}

/** "창세기 1–3장" / "시편 23편" / "룻기 4장, 사무엘상 1–2장" (성경 순서로 묶음) */
export function formatChapters(refs: ChapterRef[]): string {
  const keys = [
    ...new Set(refs.map((r) => chapterKey(r.book, r.chapter))),
  ].sort((a, b) => a - b);
  const segments: { book: number; from: number; to: number }[] = [];
  for (const { book, chapter } of keys.map(fromChapterKey)) {
    const last = segments[segments.length - 1];
    if (last && last.book === book && last.to === chapter - 1) {
      last.to = chapter;
    } else {
      segments.push({ book, from: chapter, to: chapter });
    }
  }
  return segments
    .map(({ book, from, to }) => {
      const unit = chapterUnit(book);
      return from === to
        ? `${bookName(book)} ${from}${unit}`
        : `${bookName(book)} ${from}–${to}${unit}`;
    })
    .join(", ");
}
