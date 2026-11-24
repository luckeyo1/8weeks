import { getCfEnv } from "@/lib/cf";
import { buildAssetLinks, collectFingerprints } from "@/lib/android";

/**
 * Digital Asset Links — 안드로이드 앱(TWA)이 주소창 없이 열리기 위한 사이트 측 인증.
 * https://<도메인>/.well-known/assetlinks.json
 *
 * 지문은 src/lib/android.ts + (선택) Cloudflare 변수 ANDROID_SHA256_FINGERPRINTS.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  let extra: string | undefined;
  try {
    extra = (await getCfEnv()).ANDROID_SHA256_FINGERPRINTS;
  } catch {
    // Cloudflare 컨텍스트가 없는 환경(next start 등)에서는 코드의 지문만 쓴다.
  }
  return Response.json(buildAssetLinks(collectFingerprints(extra)), {
    headers: {
      "Cache-Control": "public, max-age=300",
    },
  });
}
