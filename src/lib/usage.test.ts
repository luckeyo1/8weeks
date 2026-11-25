import { describe, expect, it } from "vitest";
import { summarizeUsage, usageSince } from "./usage";
import { isAnalyticsEvent } from "./analytics";

describe("isAnalyticsEvent", () => {
  it("허용 목록만 통과", () => {
    expect(isAnalyticsEvent("bible_listen_started")).toBe(true);
    expect(isAnalyticsEvent("prayer_title_leak")).toBe(false);
    expect(isAnalyticsEvent(42)).toBe(false);
    expect(isAnalyticsEvent(undefined)).toBe(false);
  });
});

describe("summarizeUsage", () => {
  const today = "2026-11-25";

  it("오늘·최근 7일·그 전 7일로 나눠 더한다", () => {
    const s = summarizeUsage(
      [
        { day: "2026-11-25", event: "bible_chapter_opened", count: 4 },
        { day: "2026-11-19", event: "bible_chapter_opened", count: 6 }, // 최근 7일의 첫날
        { day: "2026-11-18", event: "bible_chapter_opened", count: 5 }, // 그 전 7일
        { day: "2026-11-12", event: "bible_chapter_opened", count: 1 }, // 그 전 7일의 첫날
        { day: "2026-11-11", event: "bible_chapter_opened", count: 100 }, // 범위 밖
        { day: "2026-11-26", event: "bible_chapter_opened", count: 100 }, // 미래(시계 차이)
      ],
      today,
    );
    expect(s.rows).toEqual([
      {
        event: "bible_chapter_opened",
        label: "성경 장 열기",
        today: 4,
        last7: 10,
        prev7: 6,
      },
    ]);
  });

  it("허용 목록 순서, 모르는 이벤트는 버린다", () => {
    const s = summarizeUsage(
      [
        { day: today, event: "push_enabled", count: 1 },
        { day: today, event: "prayer_created", count: 2 },
        { day: today, event: "unknown_event", count: 9 },
      ],
      today,
    );
    expect(s.rows.map((r) => r.event)).toEqual([
      "prayer_created",
      "push_enabled",
    ]);
  });

  it("듣기 비율 (분모 0 이면 null)", () => {
    const s = summarizeUsage(
      [
        { day: today, event: "bible_chapter_opened", count: 10 },
        { day: today, event: "bible_listen_started", count: 4 },
        { day: today, event: "bible_listen_completed", count: 1 },
      ],
      today,
    );
    expect(s.listenStartRate).toBeCloseTo(0.4);
    expect(s.listenCompleteRate).toBeCloseTo(0.25);
    const empty = summarizeUsage([], today);
    expect(empty.rows).toEqual([]);
    expect(empty.listenStartRate).toBeNull();
    expect(empty.listenCompleteRate).toBeNull();
  });

  it("읽는 시작일", () => {
    expect(usageSince(today)).toBe("2026-11-12");
  });
});
