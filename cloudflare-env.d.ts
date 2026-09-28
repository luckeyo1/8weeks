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
}
