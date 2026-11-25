import "server-only";

import { buildVapidAuth, type VapidKeys } from "./vapid";

export type PushResult =
  | { ok: true }
  | { ok: false; gone: boolean; status: number };

/**
 * 데이터 없는 웹 푸시 1건 전송. 서비스워커가 고정 문구로 알림을 띄운다.
 * 404/410 → 구독 만료(gone) 이므로 호출부에서 해당 구독을 삭제한다.
 */
export async function sendPush(
  endpoint: string,
  keys: VapidKeys,
  ttlSeconds = 12 * 60 * 60,
): Promise<PushResult> {
  try {
    const auth = await buildVapidAuth(endpoint, keys);
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: auth,
        TTL: String(ttlSeconds),
      },
      // 빈 본문: fetch 가 Content-Length: 0 을 붙인다.
      // (Content-Length 를 직접 지정하면 fetch 가 요청을 거부해 발송이 전부 실패했었다)
      body: new Uint8Array(0),
    });
    if (res.ok) return { ok: true };
    return { ok: false, gone: res.status === 404 || res.status === 410, status: res.status };
  } catch (e) {
    console.error("[push] send failed:", e instanceof Error ? e.message : e);
    return { ok: false, gone: false, status: 0 };
  }
}

/** 환경변수에서 VAPID 키를 읽어온다(없으면 null) */
export function readVapidKeys(env: {
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
}): VapidKeys | null {
  // 대시보드에 붙여 넣을 때 섞인 앞뒤 공백·줄바꿈 제거
  const publicKey = env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return null;
  return {
    publicKey,
    privateKey,
    subject: env.VAPID_SUBJECT?.trim() || "mailto:admin@example.com",
  };
}
