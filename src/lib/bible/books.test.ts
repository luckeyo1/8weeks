import { describe, expect, it } from "vitest";
import {
  BIBLE_BOOKS,
  MAX_CHAPTERS_PER_DAY,
  OLD_TESTAMENT_BOOKS,
  TOTAL_CHAPTERS,
  bookName,
  chapterCount,
  formatChapters,
  isValidChapter,
  nextChapter,
  normalizeChapterRefs,
} from "./books";

describe("BIBLE_BOOKS", () => {
  it("66권 1189장, 구약 39권", () => {
    expect(BIBLE_BOOKS).toHaveLength(66);
    expect(TOTAL_CHAPTERS).toBe(1189);
    expect(bookName(OLD_TESTAMENT_BOOKS)).toBe("말라기");
    expect(bookName(OLD_TESTAMENT_BOOKS + 1)).toBe("마태복음");
  });
  it("책 번호는 1부터", () => {
    expect(bookName(1)).toBe("창세기");
    expect(chapterCount(19)).toBe(150); // 시편
    expect(bookName(66)).toBe("요한계시록");
    expect(bookName(0)).toBe("");
    expect(chapterCount(67)).toBe(0);
  });
});

describe("isValidChapter", () => {
  it("범위 안만 허용", () => {
    expect(isValidChapter(1, 1)).toBe(true);
    expect(isValidChapter(1, 50)).toBe(true);
    expect(isValidChapter(1, 51)).toBe(false);
    expect(isValidChapter(1, 0)).toBe(false);
    expect(isValidChapter(0, 1)).toBe(false);
    expect(isValidChapter(67, 1)).toBe(false);
    expect(isValidChapter(1.5, 1)).toBe(false);
  });
});

describe("normalizeChapterRefs", () => {
  it("중복 제거 + 성경 순서 정렬", () => {
    expect(
      normalizeChapterRefs([
        { book: 9, chapter: 1 },
        { book: 8, chapter: 4 },
        { book: 9, chapter: 1 },
      ]),
    ).toEqual([
      { book: 8, chapter: 4 },
      { book: 9, chapter: 1 },
    ]);
  });
  it("빈 배열은 허용 (오늘 기록 지우기)", () => {
    expect(normalizeChapterRefs([])).toEqual([]);
  });
  it("잘못된 입력은 전부 거부", () => {
    expect(normalizeChapterRefs("x")).toBeNull();
    expect(normalizeChapterRefs([{ book: 1, chapter: 51 }])).toBeNull();
    expect(normalizeChapterRefs([{ book: "1", chapter: 1 }])).toBeNull();
    expect(normalizeChapterRefs([null])).toBeNull();
    const tooMany = Array.from({ length: MAX_CHAPTERS_PER_DAY + 1 }, () => ({
      book: 1,
      chapter: 1,
    }));
    expect(normalizeChapterRefs(tooMany)).toBeNull();
  });
});

describe("nextChapter", () => {
  it("같은 책 다음 장", () => {
    expect(nextChapter({ book: 44, chapter: 21 })).toEqual({
      book: 44,
      chapter: 22,
    });
  });
  it("책 끝이면 다음 책 1장", () => {
    expect(nextChapter({ book: 1, chapter: 50 })).toEqual({
      book: 2,
      chapter: 1,
    });
  });
  it("요한계시록 22장 다음은 창세기 1장", () => {
    expect(nextChapter({ book: 66, chapter: 22 })).toEqual({
      book: 1,
      chapter: 1,
    });
  });
});

describe("formatChapters", () => {
  it("연속 장은 범위로", () => {
    expect(
      formatChapters([
        { book: 1, chapter: 3 },
        { book: 1, chapter: 1 },
        { book: 1, chapter: 2 },
      ]),
    ).toBe("창세기 1–3장");
  });
  it("끊긴 장은 따로, 책이 바뀌면 쉼표", () => {
    expect(
      formatChapters([
        { book: 8, chapter: 4 },
        { book: 9, chapter: 1 },
        { book: 9, chapter: 2 },
        { book: 9, chapter: 5 },
      ]),
    ).toBe("룻기 4장, 사무엘상 1–2장, 사무엘상 5장");
  });
  it("시편은 '편', 중복은 한 번만", () => {
    expect(
      formatChapters([
        { book: 19, chapter: 23 },
        { book: 19, chapter: 23 },
      ]),
    ).toBe("시편 23편");
  });
  it("빈 목록은 빈 문자열", () => {
    expect(formatChapters([])).toBe("");
  });
});
