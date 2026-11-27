/**
 * 성경 하이라이트 (절 단위 색 표시) — 순수 함수.
 * 저장: bible_highlights (migrations/0014), 본인에게만 보인다.
 */

export const HIGHLIGHT_COLORS = ["yellow", "green", "blue", "pink"] as const;
export type HighlightColor = (typeof HIGHLIGHT_COLORS)[number];

export function isHighlightColor(value: unknown): value is HighlightColor {
  return (
    typeof value === "string" &&
    (HIGHLIGHT_COLORS as readonly string[]).includes(value)
  );
}

/**
 * 색 이름과 클래스. 글자(#222)가 잘 읽히는 옅은 색.
 * Tailwind 가 찾을 수 있도록 클래스 문자열을 통째로 적는다.
 */
export const HIGHLIGHT_STYLE: Record<
  HighlightColor,
  { name: string; bg: string; swatch: string }
> = {
  yellow: { name: "노랑", bg: "bg-[#FBEFB6]", swatch: "bg-[#F2D65C]" },
  green: { name: "초록", bg: "bg-[#DDEBD0]", swatch: "bg-[#94C27A]" },
  blue: { name: "파랑", bg: "bg-[#D8E7F5]", swatch: "bg-[#7FAEDB]" },
  pink: { name: "분홍", bg: "bg-[#F6DDE4]", swatch: "bg-[#E59AB0]" },
};

/** 한 장의 최대 절 수 (시편 119편) */
export const MAX_VERSE = 176;

/** 절 번호 목록 검증: 정수 1~176, 중복 제거·정렬. 비었거나 틀리면 null */
export function normalizeVerses(verses: unknown): number[] | null {
  if (!Array.isArray(verses) || verses.length === 0) return null;
  if (verses.length > MAX_VERSE) return null;
  const set = new Set<number>();
  for (const v of verses) {
    if (typeof v !== "number" || !Number.isInteger(v)) return null;
    if (v < 1 || v > MAX_VERSE) return null;
    set.add(v);
  }
  return [...set].sort((a, b) => a - b);
}

export type HighlightRow = {
  book: number;
  chapter: number;
  verse: number;
  color: HighlightColor;
};

export type HighlightGroup = {
  book: number;
  chapter: number;
  color: HighlightColor;
  first: number;
  last: number;
};

/**
 * 같은 장·같은 색·이어진 절을 한 묶음으로. 묶음 순서는 처음 나온(=가장 최근에 고친) 순서.
 * 행은 최근 수정 순으로 들어온다고 가정한다.
 */
export function groupHighlights(
  rows: readonly HighlightRow[],
): HighlightGroup[] {
  const byKey = new Map<string, { order: number; verses: Set<number> }>();
  rows.forEach((r, i) => {
    const key = `${r.book}:${r.chapter}:${r.color}`;
    const entry = byKey.get(key) ?? { order: i, verses: new Set<number>() };
    entry.verses.add(r.verse);
    byKey.set(key, entry);
  });

  const groups: (HighlightGroup & { order: number })[] = [];
  for (const [key, { order, verses }] of byKey) {
    const [book, chapter, color] = key.split(":") as [
      string,
      string,
      HighlightColor,
    ];
    const sorted = [...verses].sort((a, b) => a - b);
    let start = sorted[0]!;
    let prev = start;
    const push = (first: number, last: number, sub: number) =>
      groups.push({
        book: Number(book),
        chapter: Number(chapter),
        color,
        first,
        last,
        order: order + sub / 1000,
      });
    let sub = 0;
    for (const v of sorted.slice(1)) {
      if (v !== prev + 1) {
        push(start, prev, sub++);
        start = v;
      }
      prev = v;
    }
    push(start, prev, sub);
  }
  return groups
    .sort((a, b) => a.order - b.order)
    .map(({ order: _order, ...g }) => g);
}

/** "1-3" / "5" */
export function formatVerseRange(first: number, last: number): string {
  return first === last ? String(first) : `${first}-${last}`;
}
