import { describe, expect, it } from "vitest";
import {
  HIGHLIGHT_COLORS,
  HIGHLIGHT_STYLE,
  formatVerseRange,
  groupHighlights,
  isHighlightColor,
  normalizeVerses,
  type HighlightRow,
} from "./highlights";

describe("색", () => {
  it("허용된 색만", () => {
    expect(isHighlightColor("yellow")).toBe(true);
    expect(isHighlightColor("red")).toBe(false);
    expect(isHighlightColor(null)).toBe(false);
  });
  it("모든 색에 이름과 클래스가 있다", () => {
    for (const c of HIGHLIGHT_COLORS) {
      expect(HIGHLIGHT_STYLE[c].name).toBeTruthy();
      expect(HIGHLIGHT_STYLE[c].bg).toMatch(/^bg-\[#/);
    }
  });
});

describe("normalizeVerses", () => {
  it("중복 제거·정렬", () => {
    expect(normalizeVerses([3, 1, 3, 2])).toEqual([1, 2, 3]);
  });
  it("범위 밖·정수 아님·빈 목록은 null", () => {
    expect(normalizeVerses([])).toBeNull();
    expect(normalizeVerses([0])).toBeNull();
    expect(normalizeVerses([177])).toBeNull();
    expect(normalizeVerses([1.5])).toBeNull();
    expect(normalizeVerses(["1"])).toBeNull();
    expect(normalizeVerses("1")).toBeNull();
    expect(
      normalizeVerses(Array.from({ length: 177 }, (_, i) => (i % 176) + 1)),
    ).toBeNull();
  });
  it("시편 119편 176절까지", () => {
    expect(normalizeVerses([176])).toEqual([176]);
  });
});

describe("groupHighlights", () => {
  const r = (
    book: number,
    chapter: number,
    verse: number,
    color: HighlightRow["color"],
  ): HighlightRow => ({
    book,
    chapter,
    verse,
    color,
  });

  it("같은 장·색·이어진 절을 묶고, 최근에 고친 순서를 지킨다", () => {
    const groups = groupHighlights([
      r(19, 23, 2, "yellow"), // 가장 최근
      r(43, 3, 16, "green"),
      r(19, 23, 1, "yellow"),
      r(19, 23, 3, "yellow"),
      r(19, 23, 6, "yellow"), // 떨어진 절 → 따로
      r(19, 23, 4, "blue"), // 다른 색 → 따로
    ]);
    expect(groups).toEqual([
      { book: 19, chapter: 23, color: "yellow", first: 1, last: 3 },
      { book: 19, chapter: 23, color: "yellow", first: 6, last: 6 },
      { book: 43, chapter: 3, color: "green", first: 16, last: 16 },
      { book: 19, chapter: 23, color: "blue", first: 4, last: 4 },
    ]);
  });

  it("빈 목록", () => {
    expect(groupHighlights([])).toEqual([]);
  });
});

describe("formatVerseRange", () => {
  it("한 절 / 여러 절", () => {
    expect(formatVerseRange(5, 5)).toBe("5");
    expect(formatVerseRange(1, 3)).toBe("1-3");
  });
});
