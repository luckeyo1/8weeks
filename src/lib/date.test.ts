import { describe, expect, it } from "vitest";
import {
  addDaysISO,
  computeEndDate,
  daysLeft,
  formatDDay,
  formatKoreanDate,
  formatKoreanDateWithWeekday,
  formatKoreanRange,
  isPastEndDate,
  toLocalDateISO,
} from "./date";

describe("toLocalDateISO", () => {
  it("Asia/Seoul 기준으로 날짜를 변환한다", () => {
    // 2024-01-01T15:30:00Z → 서울은 +9시간 → 2024-01-02
    const d = new Date("2024-01-01T15:30:00Z");
    expect(toLocalDateISO(d, "Asia/Seoul")).toBe("2024-01-02");
    expect(toLocalDateISO(d, "UTC")).toBe("2024-01-01");
  });
});

describe("addDaysISO", () => {
  it("일수를 더한다", () => {
    expect(addDaysISO("2024-01-01", 7)).toBe("2024-01-08");
    expect(addDaysISO("2024-01-31", 1)).toBe("2024-02-01");
  });
  it("음수도 처리한다", () => {
    expect(addDaysISO("2024-03-01", -1)).toBe("2024-02-29"); // 윤년
  });
});

describe("computeEndDate", () => {
  it("7일 = 시작일 + 7 (예: 9/22 → 9/29)", () => {
    expect(computeEndDate("2025-09-22", 7)).toBe("2025-09-29");
  });
});

describe("daysLeft", () => {
  it("종료일까지 남은 일수", () => {
    expect(daysLeft("2024-01-08", "2024-01-01")).toBe(7);
    expect(daysLeft("2024-01-01", "2024-01-01")).toBe(0);
    expect(daysLeft("2024-01-01", "2024-01-03")).toBe(-2);
  });
});

describe("isPastEndDate", () => {
  it("오늘이 종료일을 지나면 true", () => {
    expect(isPastEndDate("2024-01-01", "2024-01-02")).toBe(true);
    expect(isPastEndDate("2024-01-01", "2024-01-01")).toBe(false); // 당일은 아직 진행
    expect(isPastEndDate("2024-01-05", "2024-01-01")).toBe(false);
  });
});

describe("formatDDay", () => {
  it("D-표기", () => {
    expect(formatDDay("2024-01-06", "2024-01-01")).toBe("D-5");
    expect(formatDDay("2024-01-01", "2024-01-01")).toBe("D-day");
    expect(formatDDay("2024-01-01", "2024-01-02")).toBe("종료");
  });
});

describe("한국어 날짜 포맷", () => {
  it("월/일", () => {
    expect(formatKoreanDate("2025-09-22")).toBe("9월 22일");
  });
  it("요일 포함", () => {
    // 2025-09-22 은 월요일
    expect(formatKoreanDateWithWeekday("2025-09-22")).toBe("9월 22일 월요일");
  });
  it("범위", () => {
    expect(formatKoreanRange("2025-09-22", "2025-09-29")).toBe(
      "9월 22일 ~ 9월 29일",
    );
  });
});
