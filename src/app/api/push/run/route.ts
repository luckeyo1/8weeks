import { NextResponse } from "next/server";
import { getCfEnv } from "@/lib/cf";
import { appNowMinutes, appTodayISO } from "@/lib/date";
import { isReminderDue } from "@/lib/reminder";
import { readVapidKeys, sendPush } from "@/lib/push/send";
import {
  deleteSubscription,
  listReminderTargets,
  markReminderSent,
} from "@/services/reminder";

export const dynamic = "force-dynamic";

/**
 * 매일 알림 발송 (Cloudflare Cron 이 15분마다 호출 — worker.ts).
 * 보호: 헤더 x-cron-secret === env.CRON_SECRET. 일치하지 않으면 404(존재 숨김).
 *
 * 대상: 알림을 켠 사용자 중 "정한 시각(기본 08:00)이 지났고 2시간 이내, 오늘 아직 안 보낸" 사람.
 * 민감정보 보호: 푸시 서비스에는 데이터 없는 푸시만 보낸다. 알림 문구는 기기의 서비스워커가
 * 받은 뒤 /api/push/message 에서 직접(HTTPS, 로그인 세션으로) 가져온다.
 */
export async function POST(request: Request): Promise<Response> {
  const env = await getCfEnv();
  const secret = (env.CRON_SECRET ?? process.env.CRON_SECRET)?.trim();
  const provided = request.headers.get("x-cron-secret")?.trim();
  if (!secret || provided !== secret) {
    return new NextResponse("Not found", { status: 404 });
  }

  const keys = readVapidKeys(env);
  if (!keys) {
    return NextResponse.json(
      { ok: false, reason: "vapid_not_configured" },
      { status: 503 },
    );
  }

  // 로컬 테스트에서만 시각을 지정할 수 있다 (?now=ISO)
  const nowParam =
    process.env.NODE_ENV !== "production"
      ? new URL(request.url).searchParams.get("now")
      : null;
  const now = nowParam ? new Date(nowParam) : new Date();
  const today = appTodayISO(now);
  const nowMinutes = appNowMinutes(now);

  const targets = await listReminderTargets();
  if (!targets) {
    return NextResponse.json(
      { ok: false, reason: "reminder_migration_pending" },
      { status: 503 },
    );
  }

  let due = 0;
  let sent = 0;
  let removed = 0;
  for (const t of targets) {
    if (
      !isReminderDue({
        time: t.reminderTime,
        nowMinutes,
        sentDate: t.sentDate,
        today,
      })
    ) {
      continue;
    }
    due += 1;
    for (const sub of t.subscriptions) {
      const result = await sendPush(sub.endpoint, keys);
      if (result.ok) {
        sent += 1;
      } else if (result.gone) {
        await deleteSubscription(sub.id);
        removed += 1;
      }
    }
    // 일부 기기 실패와 관계없이 오늘은 한 번만 (중복 알림 방지)
    await markReminderSent(t.userId, today);
  }

  return NextResponse.json({
    ok: true,
    users: targets.length,
    due,
    sent,
    removed,
  });
}
