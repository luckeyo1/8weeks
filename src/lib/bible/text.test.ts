import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BIBLE_BOOKS, TOTAL_CHAPTERS, chapterCount } from "./books";
import {
  bookNumber,
  chapterDataUrl,
  chapterHref,
  nextChapterOrNull,
  parseChapterParams,
  prevChapter,
} from "./text";

const PUBLIC = join(__dirname, "../../../public");

describe("성경 본문 데이터 (public/bibledata)", () => {
  it("66권 1,189장 파일이 모두 있고, 빈 절이 없으며 총 31,101절이다", () => {
    let chapters = 0;
    let verses = 0;
    BIBLE_BOOKS.forEach(([, count], i) => {
      for (let c = 1; c <= count; c++) {
        const file = join(PUBLIC, chapterDataUrl(i + 1, c));
        expect(existsSync(file), file).toBe(true);
        const data = JSON.parse(readFileSync(file, "utf8")) as { v: string[] };
        expect(data.v.length).toBeGreaterThan(0);
        for (const t of data.v) expect(t.trim().length).toBeGreaterThan(0);
        chapters += 1;
        verses += data.v.length;
      }
    });
    expect(chapters).toBe(TOTAL_CHAPTERS);
    expect(verses).toBe(31101);
  });

  it("대표 구절이 개역한글 본문과 같다", () => {
    const read = (b: number, c: number) =>
      (JSON.parse(readFileSync(join(PUBLIC, chapterDataUrl(b, c)), "utf8")) as { v: string[] }).v;
    expect(read(1, 1)[0]).toBe("태초에 하나님이 천지를 창조하시니라");
    expect(read(19, 23)[0]).toBe("여호와는 나의 목자시니 내가 부족함이 없으리로다");
    expect(read(43, 3)[15]).toContain("하나님이 세상을 이처럼 사랑하사");
  });
});

describe("장 이동 · 주소", () => {
  it("이전/다음 장은 책 경계와 처음·끝을 다룬다", () => {
    expect(prevChapter({ book: 1, chapter: 1 })).toBeNull();
    expect(prevChapter({ book: 2, chapter: 1 })).toEqual({ book: 1, chapter: 50 });
    expect(nextChapterOrNull({ book: 1, chapter: 50 })).toEqual({ book: 2, chapter: 1 });
    expect(nextChapterOrNull({ book: 66, chapter: chapterCount(66) })).toBeNull();
  });

  it("주소 조각을 검증한다", () => {
    expect(parseChapterParams("19", "150")).toEqual({ book: 19, chapter: 150 });
    expect(parseChapterParams("19", "151")).toBeNull();
    expect(parseChapterParams("0", "1")).toBeNull();
    expect(parseChapterParams("67", "1")).toBeNull();
    expect(parseChapterParams("krv", "1")).toBeNull();
    expect(parseChapterParams("1", "1.5")).toBeNull();
  });

  it("책 이름 → 번호, 읽기 주소", () => {
    expect(bookNumber("요한복음")).toBe(43);
    expect(bookNumber("없는책")).toBe(0);
    expect(chapterHref(43, 3, 16)).toBe("/bible/43/3#v16");
    expect(chapterHref(1, 1)).toBe("/bible/1/1");
  });
});
