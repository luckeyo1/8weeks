/// <reference types="@cloudflare/workers-types" />

/**
 * Cloudflare Workers 바인딩/환경변수 타입.
 * wrangler.jsonc 의 바인딩과 일치해야 한다.
 */
interface CloudflareEnv {
  /** D1 데이터베이스 */
  DB: D1Database;

  /** 공개 값 (빌드 시 인라인되는 NEXT_PUBLIC_* 는 process.env 로도 접근) */
  NEXT_PUBLIC_SITE_URL?: string;

  /** 세션 쿠키 서명 비밀키 (HMAC) */
  SESSION_SECRET?: string;

  /** 관리자 아이디 목록 (콤마 구분). 여기 포함된 username 만 /admin 접근 */
  ADMIN_USERNAMES?: string;

  /** 서비스 기준 timezone (선택) */
  NEXT_PUBLIC_APP_TIME_ZONE?: string;

  /** Web Push VAPID 공개키 (base64url, 65바이트 EC 포인트) — 클라이언트 구독에 사용 */
  VAPID_PUBLIC_KEY?: string;
  /** Web Push VAPID 개인키 (base64url, 32바이트 d) — 서버 서명 전용(비밀) */
  VAPID_PRIVATE_KEY?: string;
  /** VAPID subject (mailto:운영자 이메일 또는 서비스 URL) */
  VAPID_SUBJECT?: string;

  /** 일일 리마인더 트리거 보호용 비밀 (스케줄러가 헤더로 전달) */
  CRON_SECRET?: string;

  /** 카카오 로그인: REST API 키 (없으면 카카오 버튼을 숨김) */
  KAKAO_REST_API_KEY?: string;
  /** 카카오 로그인: Client Secret (콘솔에서 사용 설정한 경우) */
  KAKAO_CLIENT_SECRET?: string;
  /** 카카오: 어드민 키 — 회원 탈퇴 시 연결 끊기(선택, 비밀) */
  KAKAO_ADMIN_KEY?: string;
  /** 로컬 테스트 전용: 가짜 카카오 서버 주소 (production 에서는 무시) */
  KAKAO_AUTH_BASE?: string;
  KAKAO_API_BASE?: string;

  /**
   * 안드로이드 앱 서명 SHA-256 지문 추가분 (콤마 구분, 선택).
   * src/lib/android.ts 의 지문에 더해 /.well-known/assetlinks.json 에 실린다.
   */
  ANDROID_SHA256_FINGERPRINTS?: string;
}
