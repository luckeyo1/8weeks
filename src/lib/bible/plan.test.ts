import { describe, expect, it } from "vitest";
import { dayOfYear, formatReading, readingForDay, todaysReading } from "./plan";
import { BIBLE_BOOKS, PLAN_ENDS_365, PLAN_ENDS_366 } from "./plan-data";

describe("dayOfYear", () => {
  it("1월 1일은 1일째", () => {
    expect(dayOfYear("2026-01-01")).toEqual({ day: 1, daysInYear: 365 });
  });
  it("평년 12월 31일은 365일째", () => {
    expect(dayOfYear("2026-12-31")).toEqual({ day: 365, daysInYear: 365 });
  });
  it("윤년 12월 31일은 366일째, 3월 1일은 61일째", () => {
    expect(dayOfYear("2028-12-31")).toEqual({ day: 366, daysInYear: 366 });
    expect(dayOfYear("2028-03-01")).toEqual({ day: 61, daysInYear: 366 });
  });
  it("2000년은 윤년, 2100년은 평년", () => {
    expect(dayOfYear("2000-12-31").daysInYear).toBe(366);
    expect(dayOfYear("2100-12-31").daysInYear).toBe(365);
  });
});

describe("읽기표 데이터", () => {
  it("66권 1189장", () => {
    expect(BIBLE_BOOKS).toHaveLength(66);
    expect(BIBLE_BOOKS.reduce((n, [, c]) => n + c, 0)).toBe(1189);
  });

  for (const days of [365, 366] as const) {
    it(`${days}일 표: 모든 장을 순서대로 정확히 한 번씩, 하루 1장 이상`, () => {
      const ends = days === 366 ? PLAN_ENDS_366 : PLAN_ENDS_365;
      expect(ends).toHaveLength(days);
      expect(ends[days - 1]).toBe(1189);

      const read: string[] = [];
      for (let d = 1; d <= days; d++) {
        const segs = readingForDay(d, days);
        expect(segs.length).toBeGreaterThan(0);
        for (const s of segs) {
          for (let c = s.from; c <= s.to; c++) read.push(`${s.book} ${c}`);
        }
      }
      const expected = BIBLE_BOOKS.flatMap(([book, count]) =>
        Array.from({ length: count }, (_, i) => `${book} ${i + 1}`),
      );
      expect(read).toEqual(expected);
    });
  }
});

describe("todaysReading", () => {
  it("1월 1일은 창세기부터, 12월 31일은 요한계시록 22장으로 끝", () => {
    expect(todaysReading("2026-01-01")[0]).toMatchObject({
      book: "창세기",
      from: 1,
    });
    for (const last of ["2026-12-31", "2028-12-31"]) {
      const segs = todaysReading(last);
      expect(segs[segs.length - 1]).toMatchObject({
        book: "요한계시록",
        to: 22,
      });
    }
  });
});

describe("formatReading", () => {
  it("한 권 범위 / 한 장", () => {
    expect(formatReading([{ book: "창세기", from: 1, to: 3 }])).toBe(
      "창세기 1–3장",
    );
    expect(formatReading([{ book: "오바댜", from: 1, to: 1 }])).toBe(
      "오바댜 1장",
    );
  });
  it("시편은 '편'", () => {
    expect(formatReading([{ book: "시편", from: 23, to: 25 }])).toBe(
      "시편 23–25편",
    );
  });
  it("두 권에 걸치면 쉼표로 잇는다", () => {
    expect(
      formatReading([
        { book: "룻기", from: 4, to: 4 },
        { book: "사무엘상", from: 1, to: 2 },
      ]),
    ).toBe("룻기 4장, 사무엘상 1–2장");
  });
});
