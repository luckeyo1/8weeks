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
        "Content-Length": "0",
      },
    });
    if (res.ok) return { ok: true };
    return { ok: false, gone: res.status === 404 || res.status === 410, status: res.status };
  } catch {
    return { ok: false, gone: false, status: 0 };
  }
}

/** 환경변수에서 VAPID 키를 읽어온다(없으면 null) */
export function readVapidKeys(env: {
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
}): VapidKeys | null {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return null;
  return {
    publicKey: env.VAPID_PUBLIC_KEY,
    privateKey: env.VAPID_PRIVATE_KEY,
    subject: env.VAPID_SUBJECT || "mailto:admin@example.com",
  };
}
