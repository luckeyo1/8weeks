import { describe, expect, it } from "vitest";
import { dailySeries } from "./stats";

describe("dailySeries", () => {
  const today = "2026-11-27";

  it("오늘 포함 14일, 오래된 날부터, 빈 날은 0", () => {
    const s = dailySeries(
      [
        { date: "2026-11-27", n: 3 },
        { date: "2026-11-24", n: 1 },
      ],
      [
        { date: "2026-11-27", n: 7 },
        { date: "2026-11-14", n: 2 }, // 14일 중 첫날
      ],
      today,
    );
    expect(s).toHaveLength(14);
    expect(s[0]).toEqual({ date: "2026-11-14", readers: 0, chapters: 2 });
    expect(s[13]).toEqual({ date: "2026-11-27", readers: 3, chapters: 7 });
    expect(s[10]).toEqual({ date: "2026-11-24", readers: 1, chapters: 0 });
    expect(s.filter((d) => d.readers === 0 && d.chapters === 0)).toHaveLength(
      11,
    );
  });

  it("범위 밖 날짜는 버린다", () => {
    const s = dailySeries(
      [
        { date: "2026-11-13", n: 9 }, // 15일 전
        { date: "2026-11-28", n: 9 }, // 내일(시계 차이)
      ],
      [],
      today,
    );
    expect(s.every((d) => d.readers === 0)).toBe(true);
  });

  it("달이 바뀌어도 날짜가 이어진다", () => {
    const s = dailySeries([], [], "2026-12-02", 4);
    expect(s.map((d) => d.date)).toEqual([
      "2026-11-29",
      "2026-11-30",
      "2026-12-01",
      "2026-12-02",
    ]);
  });
});
