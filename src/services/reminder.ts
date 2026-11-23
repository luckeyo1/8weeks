import "server-only";

import { dbAll, dbCount, dbFirst, dbRun } from "@/lib/db";
import { DEFAULT_REMINDER_TIME, isValidReminderTime } from "@/lib/reminder";

function isMissingColumn(e: unknown): boolean {
  return e instanceof Error && /no such column/i.test(e.message);
}

/** 오늘 아직 체크하지 않은 진행 중(ACTIVE) 기도 수 — 내가 만든 것 + 함께하는 것 */
export async function countPendingPrayers(
  userId: string,
  today: string,
): Promise<number> {
  return dbCount(
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
    [today, userId, userId, userId, today],
  );
}

/** 내 알림 시간. null 이면 마이그레이션(0011) 전이라 시간 선택을 숨긴다. */
export async function getReminderTime(userId: string): Promise<string | null> {
  try {
    const row = await dbFirst<{ reminder_time: string | null }>(
      "select reminder_time from users where id = ?",
      [userId],
    );
    return isValidReminderTime(row?.reminder_time)
      ? row.reminder_time
      : DEFAULT_REMINDER_TIME;
  } catch (e) {
    if (isMissingColumn(e)) return null;
    throw e;
  }
}

/** 알림 시간 저장. skipToday 면 오늘은 이미 보낸 것으로 표시(지난 시각으로 바꿨을 때 즉시 발송 방지) */
export async function saveReminderTime(
  userId: string,
  time: string,
  skipToday: string | null,
): Promise<void> {
  if (skipToday) {
    await dbRun(
      "update users set reminder_time = ?, reminder_sent_date = ?, updated_at = datetime('now') where id = ?",
      [time, skipToday, userId],
    );
  } else {
    await dbRun(
      "update users set reminder_time = ?, updated_at = datetime('now') where id = ?",
      [time, userId],
    );
  }
}

export type ReminderTarget = {
  userId: string;
  reminderTime: string | null;
  sentDate: string | null;
  subscriptions: { id: string; endpoint: string }[];
};

/** 알림을 켠 사용자별 구독 목록. 마이그레이션 전이면 null. */
export async function listReminderTargets(): Promise<ReminderTarget[] | null> {
  let rows: {
    id: string;
    endpoint: string;
    user_id: string;
    reminder_time: string | null;
    reminder_sent_date: string | null;
  }[];
  try {
    rows = await dbAll(
      `select s.id, s.endpoint, s.user_id, u.reminder_time, u.reminder_sent_date
         from push_subscriptions s join users u on u.id = s.user_id`,
    );
  } catch (e) {
    if (isMissingColumn(e)) return null;
    throw e;
  }
  const byUser = new Map<string, ReminderTarget>();
  for (const r of rows) {
    const t = byUser.get(r.user_id) ?? {
      userId: r.user_id,
      reminderTime: r.reminder_time,
      sentDate: r.reminder_sent_date,
      subscriptions: [],
    };
    t.subscriptions.push({ id: r.id, endpoint: r.endpoint });
    byUser.set(r.user_id, t);
  }
  return [...byUser.values()];
}

export async function markReminderSent(userId: string, today: string) {
  await dbRun("update users set reminder_sent_date = ? where id = ?", [
    today,
    userId,
  ]);
}

export async function deleteSubscription(id: string) {
  await dbRun("delete from push_subscriptions where id = ?", [id]);
}
