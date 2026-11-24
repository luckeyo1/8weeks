/**
 * 매일 알림 시간 (서비스 timezone 기준 "HH:MM").
 * 크론이 15분마다 돌며 "정한 시간이 지났고(2시간 이내) 오늘 아직 안 보낸" 사람에게만 보낸다.
 * 순수 함수로 두어 단위 테스트한다.
 */

export const DEFAULT_REMINDER_TIME = "08:00";

/** 크론이 늦거나 한 번 건너뛰어도 보낼 수 있게 허용하는 범위(분) */
export const REMINDER_WINDOW_MINUTES = 120;

const pad = (n: number) => String(n).padStart(2, "0");

/** 선택지: 04:00 ~ 23:30, 30분 간격 (새벽기도 시간 포함) */
export const REMINDER_TIMES: readonly string[] = Array.from(
  { length: 40 },
  (_, i) => {
    const m = 4 * 60 + i * 30;
    return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`;
  },
);

export function isValidReminderTime(t: unknown): t is string {
  return typeof t === "string" && REMINDER_TIMES.includes(t);
}

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map((v) => Number.parseInt(v, 10));
  return (h ?? 0) * 60 + (m ?? 0);
}

/** "08:00" → "오전 8:00", "12:30" → "오후 12:30", "13:00" → "오후 1:00" */
export function reminderLabel(t: string): string {
  const min = timeToMinutes(t);
  const h = Math.floor(min / 60);
  const m = min % 60;
  const ampm = h < 12 ? "오전" : "오후";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${ampm} ${h12}:${pad(m)}`;
}

/** 지금 보낼 차례인가 */
export function isReminderDue({
  time,
  nowMinutes,
  sentDate,
  today,
  windowMinutes = REMINDER_WINDOW_MINUTES,
}: {
  time: string | null;
  nowMinutes: number;
  sentDate: string | null;
  today: string;
  windowMinutes?: number;
}): boolean {
  if (sentDate === today) return false;
  const t = isValidReminderTime(time) ? time : DEFAULT_REMINDER_TIME;
  const diff = nowMinutes - timeToMinutes(t);
  return diff >= 0 && diff < windowMinutes;
}
