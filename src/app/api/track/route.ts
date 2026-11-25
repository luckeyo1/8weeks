import { getAuthUser } from "@/features/auth/service";
import { isAnalyticsEvent } from "@/lib/analytics";
import { recordUsageEvent } from "@/services/usage";

export const dynamic = "force-dynamic";

const empty = (status: number) => new Response(null, { status });

/**
 * 이용 통계 수집 (src/lib/analytics.ts 의 track → sendBeacon).
 * - 로그인한 사용자 요청만 센다(로그인 안 했으면 조용히 무시 — 204).
 * - 이벤트 이름만 받는다. 사용자 id·기도 정보는 저장하지 않는다.
 */
export async function POST(request: Request): Promise<Response> {
  const uid = await getAuthUser();
  if (!uid) return empty(204);

  let event: unknown;
  try {
    const body = (await request.json()) as { event?: unknown } | null;
    event = body?.event;
  } catch {
    return empty(400);
  }
  if (!isAnalyticsEvent(event)) return empty(400);

  try {
    await recordUsageEvent(event);
  } catch {
    // 통계 실패는 사용자에게 영향 없게
  }
  return empty(204);
}
