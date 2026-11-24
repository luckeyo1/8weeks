/**
 * 이용자 문의 · 개인정보 · 계정 삭제 요청 연락처.
 * 개인정보처리방침, 계정 삭제 안내, 플레이스토어 '스토어 설정 > 연락처 이메일'과 같게 둔다.
 * null 이면 화면에서 플레이스토어 개발자 연락처로 안내한다.
 */
export const CONTACT_EMAIL: string | null = null;

/** 연락처 문구 (이메일이 없으면 플레이스토어 개발자 연락처 안내) */
export const CONTACT_FALLBACK =
  "Google Play 스토어의 기도 동행 앱 페이지 › 앱 지원 › 개발자 이메일";
