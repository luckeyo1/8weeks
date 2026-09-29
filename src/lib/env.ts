/**
 * 공개 환경변수 (빌드 시 인라인되는 NEXT_PUBLIC_* 만).
 * 서버 비밀키(SESSION_SECRET 등)와 D1 바인딩은 Cloudflare env 로
 * 접근한다. → src/lib/cf.ts
 */

// NEXT_PUBLIC_SITE_URL 이 빌드 환경에 없을 때의 기본값.
// 배포 도메인으로 두어 OAuth 리디렉션/공유 링크가 올바른 주소를 쓰게 한다.
// 로컬 개발은 .env.local 에 http://localhost:3000 을 지정.
const DEFAULT_SITE_URL = "https://8weeks.luckeyo.workers.dev";

export const publicEnv = {
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? DEFAULT_SITE_URL,
};
