/**
 * Prayer 상태 머신 (명세 64).
 *
 *   ACTIVE ─(기간 종료/직접 마치기)→ EXPIRED
 *   EXPIRED ─(연장)→ ACTIVE
 *   EXPIRED ─(응답)→ ANSWERED
 *   EXPIRED ─(변화/마치기)→ CLOSED
 *   (어떤 상태에서든) → DELETED
 *
 * "변화가 있었어요"(CHANGED)는 CLOSED 로 마무리하되 CHANGED 업데이트를 남겨
 * 참여자에게 변화 내용을 보여줍니다. (명세 25/28)
 */
import type { PrayerStatus } from "@/types/db";
import { isPastEndDate } from "@/lib/date";

const ALLOWED: Record<PrayerStatus, PrayerStatus[]> = {
  ACTIVE: ["EXPIRED", "DELETED"],
  EXPIRED: ["ACTIVE", "ANSWERED", "CLOSED", "DELETED"],
  ANSWERED: ["DELETED"],
  CLOSED: ["DELETED"],
  DELETED: [],
};

export function canTransition(from: PrayerStatus, to: PrayerStatus): boolean {
  return ALLOWED[from]?.includes(to) ?? false;
}

export function assertTransition(from: PrayerStatus, to: PrayerStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`허용되지 않은 상태 전이입니다: ${from} → ${to}`);
  }
}

/**
 * 저장된 상태와 오늘 날짜를 바탕으로 "실질 상태"를 계산.
 * ACTIVE 인데 종료일이 지났으면 EXPIRED 로 간주한다.
 * (화면 진입 시 서버에서 재확인 — cron 실패에도 상태가 꼬이지 않음, 명세 22)
 */
export function computeEffectiveStatus(
  stored: PrayerStatus,
  endISO: string,
  todayISOStr: string,
): PrayerStatus {
  if (stored === "ACTIVE" && isPastEndDate(endISO, todayISOStr)) {
    return "EXPIRED";
  }
  return stored;
}

/** 홈 "오늘의 기도"에 노출되는 상태인가 (명세 18: 종료된 기도 제외) */
export function isActiveForHome(effective: PrayerStatus): boolean {
  return effective === "ACTIVE";
}

/** 기도 체크 가능 상태인가 (명세 67) */
export function canCheck(effective: PrayerStatus): boolean {
  return effective === "ACTIVE";
}

/** 참여(join) 가능 상태인가 (명세 66) */
export function canJoin(effective: PrayerStatus): boolean {
  return effective === "ACTIVE";
}
