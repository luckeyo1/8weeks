/**
 * Cloudflare Worker 진입점 = OpenNext 가 생성한 워커(.open-next/worker.js) + 크론(scheduled).
 *
 * - fetch: 생성된 워커를 그대로 쓴다(Next 앱).
 * - scheduled: wrangler.jsonc 의 triggers.crons(15분마다)로 실행되어 /api/push/run 을 내부
 *   호출한다. 네트워크를 거치지 않는 같은 워커 안의 호출이며 CRON_SECRET 으로 보호된다.
 *   (OpenNext 의 요청 컨텍스트·D1 바인딩을 그대로 쓰기 위해 라우트를 거친다)
 *
 * `.open-next/worker.js` 는 `opennextjs-cloudflare build` 가 만든다 — 그래서 이 파일은
 * tsconfig 에서 제외하고 wrangler(esbuild)가 번들한다.
 */
// @ts-expect-error: 빌드 시 생성되는 파일
import handler from "./.open-next/worker.js";

type Env = { CRON_SECRET?: string } & Record<string, unknown>;

const worker = {
  fetch: handler.fetch,

  async scheduled(
    _controller: unknown,
    env: Env,
    ctx: { waitUntil(p: Promise<unknown>): void },
  ) {
    if (!env.CRON_SECRET) {
      console.warn("[cron] CRON_SECRET 이 없어 매일 알림 발송을 건너뜁니다.");
      return;
    }
    const res = await handler.fetch(
      new Request("https://cron.internal/api/push/run", {
        method: "POST",
        headers: { "x-cron-secret": env.CRON_SECRET },
      }),
      env,
      ctx,
    );
    console.log("[cron] push/run", res.status, await res.text());
  },
};

export default worker;

// 생성된 워커의 Durable Object 클래스도 그대로 내보낸다(설정 시 필요)
// @ts-expect-error: 빌드 시 생성되는 파일
export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";
