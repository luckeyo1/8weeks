import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Cloudflare 실행 컨텍스트 접근.
 * D1 바인딩(DB)과 비밀키(SESSION_SECRET 등)는 Workers 환경에서
 * process.env 가 아니라 이 env 바인딩으로 들어온다.
 * (`next dev` 에서는 initOpenNextCloudflareForDev + .dev.vars 로 채워짐)
 */
export async function getCfEnv(): Promise<CloudflareEnv> {
  const { env } = await getCloudflareContext({ async: true });
  return env as CloudflareEnv;
}

export async function getDB(): Promise<D1Database> {
  const env = await getCfEnv();
  if (!env.DB) {
    throw new Error(
      "D1 바인딩(DB)이 없습니다. wrangler.jsonc 의 d1_databases 설정을 확인하세요.",
    );
  }
  return env.DB;
}

/** 서버 전용 비밀키 조회 (없으면 명확한 에러) */
export async function requireSecret(
  key: "SESSION_SECRET",
): Promise<string> {
  const env = await getCfEnv();
  const value = env[key] ?? process.env[key];
  if (!value) {
    throw new Error(`환경변수 ${key} 가 설정되지 않았습니다.`);
  }
  return value;
}
