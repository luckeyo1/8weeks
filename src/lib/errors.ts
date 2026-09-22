/**
 * 에러 처리 (명세 45/46).
 * 사용자에게 기술적 오류코드를 노출하지 않고, 자연스러운 한국어 메시지만 보여줍니다.
 */

export type AppErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "INVALID_TOKEN"
  | "PRAYER_DELETED"
  | "PRAYER_EXPIRED"
  | "ALREADY_JOINED"
  | "OWN_PRAYER"
  | "ALREADY_CHECKED"
  | "VALIDATION"
  | "UNKNOWN";

/** 코드별 사용자 노출 메시지 (명세 46) */
export const ERROR_MESSAGES: Record<AppErrorCode, string> = {
  UNAUTHENTICATED: "함께 기도하려면 로그인이 필요해요.",
  FORBIDDEN: "이 기도제목에 접근할 수 없어요.",
  NOT_FOUND: "기도제목을 찾을 수 없어요.",
  INVALID_TOKEN: "유효하지 않은 기도 초대예요.",
  PRAYER_DELETED: "더 이상 확인할 수 없는 기도제목이에요.",
  PRAYER_EXPIRED: "함께 기도하는 기간이 종료되었어요.",
  ALREADY_JOINED: "이미 함께 기도하고 있어요.",
  OWN_PRAYER: "내가 만든 기도제목이에요.",
  ALREADY_CHECKED: "오늘은 이미 함께 기도했어요.",
  VALIDATION: "입력한 내용을 다시 한 번 확인해주세요.",
  UNKNOWN: "잠시 후 다시 시도해주세요.",
};

export class AppError extends Error {
  readonly code: AppErrorCode;
  constructor(code: AppErrorCode, message?: string) {
    super(message ?? ERROR_MESSAGES[code]);
    this.name = "AppError";
    this.code = code;
  }
}

/** 서버 액션 결과 표준 형태 */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; code: AppErrorCode; message: string };

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function fail(code: AppErrorCode, message?: string): ActionResult<never> {
  return { ok: false, code, message: message ?? ERROR_MESSAGES[code] };
}

/**
 * 알 수 없는 예외를 안전한 ActionResult 로 변환.
 * Postgres unique 위반 등 기술적 메시지는 노출하지 않는다.
 */
export function toActionError(error: unknown): ActionResult<never> {
  if (error instanceof AppError) {
    return fail(error.code, error.message);
  }
  // Postgres unique_violation (23505) → 상황별 메시지는 호출부에서 처리하는 것을 권장.
  return fail("UNKNOWN");
}
