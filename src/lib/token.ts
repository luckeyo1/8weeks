/**
 * shareToken 생성 (명세 11/32).
 * - 추측 불가능한 cryptographically secure random.
 * - prayer id 를 노출하지 않는 별도 난수 토큰.
 * - 기본 22자 base62 (약 131 bits) — 최소 16자 이상 권장 충족.
 */

const ALPHABET =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

export const SHARE_TOKEN_LENGTH = 22;

export function generateShareToken(length: number = SHARE_TOKEN_LENGTH): string {
  if (length < 16) {
    throw new Error("shareToken 은 최소 16자 이상이어야 합니다.");
  }
  const bytes = new Uint8Array(length);
  // Node 22 / Edge / 브라우저 모두 globalThis.crypto 제공
  globalThis.crypto.getRandomValues(bytes);

  let out = "";
  for (let i = 0; i < length; i += 1) {
    // 62 로 나눈 나머지 → 미세한 modulo bias 는 있으나 토큰 용도로 무의미
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}

/** 토큰 형식 검증 (URL 파라미터 방어) */
export function isValidShareTokenFormat(token: string): boolean {
  return /^[0-9A-Za-z]{16,64}$/.test(token);
}
