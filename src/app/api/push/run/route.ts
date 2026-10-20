import { NextResponse } from "next/server";
import { getCfEnv } from "@/lib/cf";
import { dbAll, dbCount, dbRun } from "@/lib/db";
import { appTodayISO } from "@/lib/date";
import { readVapidKeys, sendPush } from "@/lib/push/send";

export const dynamic = "force-dynamic";

/**
 * 일일 기도 리마인더 발송 (스케줄러가 호출).
 * 보호: 헤더 x-cron-secret === env.CRON_SECRET. 일치하지 않으면 404(존재 숨김).
 *
 * 대상: 알림을 켠 사용자 중, 오늘 아직 체크하지 않은 ACTIVE 기도가 있는 사람.
 * 민감정보 보호: 데이터 없는 푸시만 보낸다(기도 내용 미포함). 문구는 서비스워커 고정.
 */
export async function POST(request: Request): Promise<Response> {
  const env = await getCfEnv();
  const secret = env.CRON_SECRET ?? process.env.CRON_SECRET;
  const provided = request.headers.get("x-cron-secret");
  if (!secret || provided !== secret) {
    return new NextResponse("Not found", { status: 404 });
  }

  const keys = readVapidKeys(env);
  if (!keys) {
    return NextResponse.json({ ok: false, reason: "vapid_not_configured" }, { status: 503 });
  }

  const today = appTodayISO();

  // 알림을 켠 사용자(구독) 목록
  const subs = await dbAll<{
    id: string;
    user_id: string;
    endpoint: string;
  }>("select id, user_id, endpoint from push_subscriptions", []);

  let sent = 0;
  let skipped = 0;
  let removed = 0;

  for (const sub of subs) {
    // 오늘 아직 체크하지 않은, 진행 중(ACTIVE) 기도가 있는지 — 내가 만든 것 + 함께하는 것
    const pending = await dbCount(
      `select count(*) as n from prayers p
       where p.status = 'ACTIVE' and p.end_date >= ?
         and (
           p.owner_id = ?
           or exists (
             select 1 from prayer_participants pp
             where pp.prayer_id = p.id and pp.user_id = ?
               and pp.status = 'ACTIVE' and pp.removed = 0
           )
         )
         and not exists (
           select 1 from prayer_checks c
           where c.prayer_id = p.id and c.user_id = ? and c.check_date = ?
         )`,
      [today, sub.user_id, sub.user_id, sub.user_id, today],
    );

    if (pending === 0) {
      skipped += 1;
      continue;
    }

    const result = await sendPush(sub.endpoint, keys);
    if (result.ok) {
      sent += 1;
    } else if (result.gone) {
      await dbRun("delete from push_subscriptions where id = ?", [sub.id]);
      removed += 1;
    }
  }

  return NextResponse.json({ ok: true, total: subs.length, sent, skipped, removed });
}
