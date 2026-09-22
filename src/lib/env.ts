/**
 * 공개 환경변수 (빌드 시 인라인되는 NEXT_PUBLIC_* 만).
 * 서버 비밀키(GOOGLE_*, SESSION_SECRET)와 D1 바인딩은 Cloudflare env 로
 * 접근한다. → src/lib/cf.ts
 */

export const publicEnv = {
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000",
};
