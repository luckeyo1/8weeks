import { describe, expect, it } from "vitest";
import {
  DEFAULT_REMINDER_TIME,
  REMINDER_TIMES,
  isReminderDue,
  isValidReminderTime,
  reminderLabel,
  timeToMinutes,
} from "./reminder";
import { appNowMinutes } from "./date";

describe("REMINDER_TIMES", () => {
  it("04:00 ~ 23:30, 30분 간격 40개, 기본값 포함", () => {
    expect(REMINDER_TIMES).toHaveLength(40);
    expect(REMINDER_TIMES[0]).toBe("04:00");
    expect(REMINDER_TIMES[REMINDER_TIMES.length - 1]).toBe("23:30");
    expect(REMINDER_TIMES).toContain(DEFAULT_REMINDER_TIME);
  });
  it("목록에 있는 값만 유효", () => {
    expect(isValidReminderTime("05:30")).toBe(true);
    expect(isValidReminderTime("05:15")).toBe(false);
    expect(isValidReminderTime("03:00")).toBe(false);
    expect(isValidReminderTime(800)).toBe(false);
  });
});

describe("reminderLabel", () => {
  it("오전/오후 12시간제", () => {
    expect(reminderLabel("04:30")).toBe("오전 4:30");
    expect(reminderLabel("08:00")).toBe("오전 8:00");
    expect(reminderLabel("12:00")).toBe("오후 12:00");
    expect(reminderLabel("21:30")).toBe("오후 9:30");
  });
});

describe("isReminderDue", () => {
  const base = { today: "2026-11-23", sentDate: null };
  it("정한 시각부터 2시간 안에만 보낸다", () => {
    const t = "08:00";
    expect(
      isReminderDue({ ...base, time: t, nowMinutes: timeToMinutes("07:59") }),
    ).toBe(false);
    expect(
      isReminderDue({ ...base, time: t, nowMinutes: timeToMinutes("08:00") }),
    ).toBe(true);
    expect(
      isReminderDue({ ...base, time: t, nowMinutes: timeToMinutes("09:59") }),
    ).toBe(true);
    expect(
      isReminderDue({ ...base, time: t, nowMinutes: timeToMinutes("10:00") }),
    ).toBe(false);
  });
  it("오늘 이미 보냈으면 다시 보내지 않는다", () => {
    expect(
      isReminderDue({
        time: "08:00",
        nowMinutes: timeToMinutes("08:15"),
        sentDate: "2026-11-23",
        today: "2026-11-23",
      }),
    ).toBe(false);
  });
  it("어제 보낸 기록은 오늘을 막지 않는다", () => {
    expect(
      isReminderDue({
        time: "08:00",
        nowMinutes: timeToMinutes("08:15"),
        sentDate: "2026-11-22",
        today: "2026-11-23",
      }),
    ).toBe(true);
  });
  it("시간이 없거나 잘못되면 기본 08:00", () => {
    expect(
      isReminderDue({
        ...base,
        time: null,
        nowMinutes: timeToMinutes("08:10"),
      }),
    ).toBe(true);
    expect(
      isReminderDue({
        ...base,
        time: "99:99",
        nowMinutes: timeToMinutes("08:10"),
      }),
    ).toBe(true);
  });
});

describe("appNowMinutes", () => {
  it("서비스 timezone(Asia/Seoul) 기준 분", () => {
    // 2026-11-22T23:30:00Z = 서울 11-23 08:30
    expect(appNowMinutes(new Date("2026-11-22T23:30:00Z"))).toBe(8 * 60 + 30);
    // 2026-11-23T15:05:00Z = 서울 11-24 00:05
    expect(appNowMinutes(new Date("2026-11-23T15:05:00Z"))).toBe(5);
  });
});
