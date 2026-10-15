import "server-only";

/**
 * 계정 복구 코드 (P1). 가입 시 1회 발급하여 사용자에게 보여주고,
 * 해시만 저장한다(평문 미보관 — 비밀번호와 동일한 PBKDF2 사용).
 * 분실 시 자기복구(/recover) 또는 관리자 재발급으로 비밀번호를 재설정한다.
 */

// 혼동하기 쉬운 문자 제외(0/O, 1/I/L) → 사람이 받아쓰기 쉬움
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const GROUPS = 3;
const GROUP_LEN = 4;

/** 예: "A7KQ-9MXT-H3PW" */
export function generateRecoveryCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(GROUPS * GROUP_LEN));
  const chars: string[] = [];
  for (let i = 0; i < bytes.length; i += 1) {
    chars.push(ALPHABET[bytes[i]! % ALPHABET.length]!);
  }
  const groups: string[] = [];
  for (let g = 0; g < GROUPS; g += 1) {
    groups.push(chars.slice(g * GROUP_LEN, (g + 1) * GROUP_LEN).join(""));
  }
  return groups.join("-");
}

/** 입력 정규화: 대문자화 + 공백/하이픈 제거 (사용자 입력 관용) */
export function normalizeRecoveryCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z0-9]/g, "");
}
