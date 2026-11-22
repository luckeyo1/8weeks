import { describe, expect, it } from "vitest";
import { formatVerseRef, pickDailyVerse } from "./daily";
import { VERSES } from "./verses";
import type { Verse } from "./types";

const sample: Verse[] = [
  { book: "가", chapter: 1, verseStart: 1, verseEnd: 1, text: "a" },
  { book: "나", chapter: 2, verseStart: 3, verseEnd: 4, text: "b" },
  { book: "다", chapter: 5, verseStart: 6, verseEnd: 6, text: "c" },
];

describe("pickDailyVerse", () => {
  it("같은 날에는 항상 같은 구절", () => {
    expect(pickDailyVerse("2026-11-22")).toBe(pickDailyVerse("2026-11-22"));
  });

  it("하루씩 다음 구절로 넘어가고, 다 돌면 처음으로", () => {
    const days = ["2026-11-22", "2026-11-23", "2026-11-24", "2026-11-25"];
    const picked = days.map((d) => pickDailyVerse(d, sample).book);
    // 연속 3일은 모두 다르고, 4일째는 첫날과 같다
    expect(new Set(picked.slice(0, 3)).size).toBe(3);
    expect(picked[3]).toBe(picked[0]);
  });

  it("월·연 경계에서도 이어진다", () => {
    const a = sample.indexOf(pickDailyVerse("2026-12-31", sample));
    const b = sample.indexOf(pickDailyVerse("2027-01-01", sample));
    expect(b).toBe((a + 1) % sample.length);
  });

  it("1970년 이전 날짜도 범위 안의 인덱스", () => {
    expect(sample).toContain(pickDailyVerse("1969-12-31", sample));
  });
});

describe("formatVerseRef", () => {
  it("단일 구절", () => {
    expect(formatVerseRef(sample[0]!)).toBe("가 1:1");
  });
  it("연속 구절", () => {
    expect(formatVerseRef(sample[1]!)).toBe("나 2:3-4");
  });
});

describe("VERSES 데이터", () => {
  it("1년의 절반 이상은 겹치지 않을 만큼 충분하다", () => {
    expect(VERSES.length).toBeGreaterThanOrEqual(180);
  });

  it("모든 구절에 본문이 있고 절 범위가 올바르다", () => {
    for (const v of VERSES) {
      expect(v.text.trim().length).toBeGreaterThan(0);
      expect(v.chapter).toBeGreaterThan(0);
      expect(v.verseStart).toBeGreaterThan(0);
      expect(v.verseEnd).toBeGreaterThanOrEqual(v.verseStart);
    }
  });

  it("같은 구절이 두 번 들어가 있지 않다", () => {
    const refs = VERSES.map(formatVerseRef);
    expect(new Set(refs).size).toBe(refs.length);
  });
});
