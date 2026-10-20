"use server";

import { getAuthUser } from "@/features/auth/service";
import { getCfEnv } from "@/lib/cf";
import { dbFirst, dbRun, newId } from "@/lib/db";
import { AppError, toActionError, ok, type ActionResult } from "@/lib/errors";

/** 클라이언트 구독에 필요한 VAPID 공개키 전달 (런타임 env 에서 읽음) */
export async function getVapidPublicKey(): Promise<ActionResult<{ key: string }>> {
  try {
    const env = await getCfEnv();
    const key = env.VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY ?? "";
    if (!key) throw new AppError("UNKNOWN", "알림 설정이 아직 준비되지 않았어요.");
    return ok({ key });
  } catch (e) {
    return toActionError(e);
  }
}

/** 구독 저장 (endpoint 기준 upsert). 한 사용자가 여러 기기 가능. */
export async function savePushSubscription(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<ActionResult> {
  try {
    const uid = await getAuthUser();
    if (!uid) throw new AppError("UNAUTHENTICATED");
    if (!input.endpoint || !input.p256dh || !input.auth) {
      throw new AppError("VALIDATION");
    }

    const existing = await dbFirst<{ id: string }>(
      "select id from push_subscriptions where endpoint = ?",
      [input.endpoint],
    );
    if (existing) {
      await dbRun(
        "update push_subscriptions set user_id = ?, p256dh = ?, auth = ? where endpoint = ?",
        [uid, input.p256dh, input.auth, input.endpoint],
      );
    } else {
      await dbRun(
        "insert into push_subscriptions (id, user_id, endpoint, p256dh, auth) values (?, ?, ?, ?, ?)",
        [newId(), uid, input.endpoint, input.p256dh, input.auth],
      );
    }
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

/** 구독 해제 (알림 끄기 / 로그아웃 시) */
export async function deletePushSubscription(
  endpoint: string,
): Promise<ActionResult> {
  try {
    const uid = await getAuthUser();
    if (!uid) throw new AppError("UNAUTHENTICATED");
    await dbRun(
      "delete from push_subscriptions where endpoint = ? and user_id = ?",
      [endpoint, uid],
    );
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}
