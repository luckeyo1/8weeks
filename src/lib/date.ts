/**
 * 날짜/기간 유틸 (명세 65/89).
 * - DB 저장은 UTC(timestamptz) / date.
 * - 표시와 daily check 기준은 사용자 local timezone 날짜.
 * - 순수 함수로 작성하여 unit test 가능.
 */

/**
 * 서비스 기준 timezone.
 * 명세 65 는 "사용자 local timezone"을 요구하나, 기기별 tz 를 섞으면
 * 서버 검증/하이드레이션에서 날짜가 꼬일 수 있다(명세 65 가 우려하는 지점).
 * 한국어 사용자 대상 서비스이므로 서버·클라이언트가 동일하게 계산하는
 * 단일 서비스 timezone(기본 Asia/Seoul)을 "오늘"의 기준으로 삼는다.
 * NEXT_PUBLIC_APP_TIME_ZONE 로 재정의 가능.
 */
export const APP_TIME_ZONE =
  process.env.NEXT_PUBLIC_APP_TIME_ZONE || "Asia/Seoul";

/** 서비스 기준 오늘 "YYYY-MM-DD" (서버/클라이언트 동일 결과) */
export function appTodayISO(now: Date = new Date()): string {
  return toLocalDateISO(now, APP_TIME_ZONE);
}

/** Date 를 특정 timezone 기준 "YYYY-MM-DD" 문자열로 변환 */
export function toLocalDateISO(date: Date, timeZone?: string): string {
  // en-CA 로케일은 YYYY-MM-DD 형식을 보장
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(date);
}

/** 오늘 날짜(사용자 local) "YYYY-MM-DD" */
export function todayISO(timeZone?: string, now: Date = new Date()): string {
  return toLocalDateISO(now, timeZone);
}

/** "YYYY-MM-DD" 를 UTC 자정 Date 로 (날짜 연산 전용) */
function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map((v) => Number.parseInt(v, 10));
  return new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, d ?? 1));
}

/** ISO 날짜에 days 를 더해 "YYYY-MM-DD" 반환 */
export function addDaysISO(iso: string, days: number): string {
  const d = parseISODate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return toLocalDateISO(d, "UTC");
}

/**
 * 남은 일수 = endDate - today (일 단위).
 * endDate 당일이면 0 (D-day), 지났으면 음수.
 */
export function daysLeft(endISO: string, todayISOStr: string): number {
  const end = parseISODate(endISO).getTime();
  const today = parseISODate(todayISOStr).getTime();
  return Math.round((end - today) / 86_400_000);
}

/** 기도가 만료되었는지: 오늘이 endDate 를 지났으면 true (명세 65, 안전방향) */
export function isPastEndDate(endISO: string, todayISOStr: string): boolean {
  return daysLeft(endISO, todayISOStr) < 0;
}

/** D-표기 ("D-5", "D-day", "종료") */
export function formatDDay(endISO: string, todayISOStr: string): string {
  const n = daysLeft(endISO, todayISOStr);
  if (n < 0) return "종료";
  if (n === 0) return "D-day";
  return `D-${n}`;
}

const WEEKDAYS_KO = ["일", "월", "화", "수", "목", "금", "토"];

/** "9월 22일 화요일" (weekday 포함) */
export function formatKoreanDateWithWeekday(iso: string): string {
  const d = parseISODate(iso);
  const month = d.getUTCMonth() + 1;
  const day = d.getUTCDate();
  const weekday = WEEKDAYS_KO[d.getUTCDay()];
  return `${month}월 ${day}일 ${weekday}요일`;
}

/** "9월 22일" */
export function formatKoreanDate(iso: string): string {
  const d = parseISODate(iso);
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일`;
}

/** "9월 22일 ~ 9월 29일" */
export function formatKoreanRange(startISO: string, endISO: string): string {
  return `${formatKoreanDate(startISO)} ~ ${formatKoreanDate(endISO)}`;
}

/** 허용 기간(일). 직접 설정은 1~90 (명세 9) */
export const DURATION_PRESETS = [7, 14, 30] as const;
export const MIN_DURATION_DAYS = 1;
export const MAX_DURATION_DAYS = 90;

/** startISO + durationDays 로 endDate 계산 (7일 = start + 7) */
export function computeEndDate(startISO: string, durationDays: number): string {
  return addDaysISO(startISO, durationDays);
}
