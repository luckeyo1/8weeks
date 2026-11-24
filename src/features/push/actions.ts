"use server";

import { getAuthUser } from "@/features/auth/service";
import { getCfEnv } from "@/lib/cf";
import { dbFirst, dbRun, newId } from "@/lib/db";
import { AppError, toActionError, ok, type ActionResult } from "@/lib/errors";
import { appNowMinutes, appTodayISO } from "@/lib/date";
import { isValidReminderTime, timeToMinutes } from "@/lib/reminder";
import { saveReminderTime } from "@/services/reminder";
import { decodeB64url } from "@/lib/push/inspect";

/** 클라이언트 구독에 필요한 VAPID 공개키 전달 (런타임 env 에서 읽음) */
export async function getVapidPublicKey(): Promise<ActionResult<{ key: string }>> {
  try {
    const env = await getCfEnv();
    // 앞뒤 공백·줄바꿈 제거 (대시보드 붙여 넣기에서 자주 섞인다)
    const key = (env.VAPID_PUBLIC_KEY ?? process.env.VAPID_PUBLIC_KEY ?? "").trim();
    if (!key) throw new AppError("UNKNOWN", "알림 설정이 아직 준비되지 않았어요.");
    const point = decodeB64url(key);
    if (!point || point.length !== 65 || point[0] !== 0x04) {
      throw new AppError(
        "UNKNOWN",
        "알림 키(VAPID_PUBLIC_KEY) 형식이 올바르지 않아요. 관리자 설정을 확인해 주세요.",
      );
    }
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

/** 매일 알림 시간 저장. 이미 지난 시각으로 바꾸면 오늘은 건너뛴다(바로 알림이 가지 않게). */
export async function setReminderTime(
  time: string,
): Promise<ActionResult<{ time: string }>> {
  try {
    const uid = await getAuthUser();
    if (!uid) throw new AppError("UNAUTHENTICATED");
    if (!isValidReminderTime(time)) throw new AppError("VALIDATION");

    const now = new Date();
    const passed = timeToMinutes(time) <= appNowMinutes(now);
    await saveReminderTime(uid, time, passed ? appTodayISO(now) : null);
    return ok({ time });
  } catch (e) {
    return toActionError(e);
  }
}
