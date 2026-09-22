import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * OpenNext Cloudflare 설정.
 * 기본 설정으로 Next.js 15(App Router + Server Actions + 미들웨어)를
 * Cloudflare Workers 에서 실행한다.
 *
 * 필요 시 캐시(incrementalCache 등)를 KV/R2 로 붙일 수 있으나,
 * 이 앱은 대부분 force-dynamic 이라 기본값으로 충분하다.
 */
export default defineCloudflareConfig();
