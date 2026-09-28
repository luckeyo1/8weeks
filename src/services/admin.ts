import "server-only";

import { dbAll, dbCount, dbRun } from "@/lib/db";
import { appTodayISO } from "@/lib/date";
import type {
  AdminOverview,
  AdminPrayer,
  AdminPrayerParticipant,
  AdminUser,
} from "@/types/domain";
import type { PrayerStatus } from "@/types/db";

/** 관리자 전용 데이터. 접근 제어는 requireAdmin() 이 담당. */

async function touchExpired(today: string): Promise<void> {
  await dbRun(
    "update prayers set status = 'EXPIRED', updated_at = datetime('now') where status = 'ACTIVE' and end_date < ?",
    [today],
  );
}

export async function getAdminOverview(): Promise<AdminOverview> {
  const today = appTodayISO();
  await touchExpired(today);

  const totalUsers = await dbCount("select count(*) as n from users");
  const statusRows = await dbAll<{ status: PrayerStatus; n: number }>(
    "select status, count(*) as n from prayers where status != 'DELETED' group by status",
  );
  const byStatus = { ACTIVE: 0, EXPIRED: 0, ANSWERED: 0, CLOSED: 0 };
  let totalPrayers = 0;
  for (const r of statusRows) {
    totalPrayers += r.n;
    if (r.status in byStatus) {
      byStatus[r.status as keyof typeof byStatus] = r.n;
    }
  }

  const totalParticipations = await dbCount(
    "select count(*) as n from prayer_participants where status != 'LEFT'",
  );
  const totalChecks = await dbCount("select count(*) as n from prayer_checks");
  const checksToday = await dbCount(
    "select count(*) as n from prayer_checks where check_date = ?",
    [today],
  );

  return {
    totalUsers,
    totalPrayers,
    byStatus,
    totalParticipations,
    totalChecks,
    checksToday,
  };
}

export async function getAdminUsers(): Promise<AdminUser[]> {
  const rows = await dbAll<{
    id: string;
    username: string | null;
    nickname: string | null;
    church_name: string | null;
    created_at: string;
    owned: number;
    joined: number;
  }>(
    `select u.id, u.username, u.nickname, u.church_name, u.created_at,
       (select count(*) from prayers p where p.owner_id = u.id and p.status != 'DELETED') as owned,
       (select count(*) from prayer_participants pp where pp.user_id = u.id and pp.status != 'LEFT') as joined
     from users u
     order by u.created_at desc`,
  );
  return rows.map((r) => ({
    id: r.id,
    username: r.username,
    nickname: r.nickname,
    churchName: r.church_name,
    createdAt: r.created_at,
    ownedCount: r.owned,
    joinedCount: r.joined,
  }));
}

export async function getAdminPrayers(): Promise<AdminPrayer[]> {
  const today = appTodayISO();
  await touchExpired(today);

  const prayers = await dbAll<{
    id: string;
    title: string;
    description: string | null;
    status: PrayerStatus;
    owner_name: string | null;
    owner_username: string | null;
    start_date: string;
    end_date: string;
    created_at: string;
    participants: number;
    checks: number;
  }>(
    `select p.id, p.title, p.description, p.status, p.start_date, p.end_date, p.created_at,
       u.nickname as owner_name, u.username as owner_username,
       (select count(*) from prayer_participants pp where pp.prayer_id = p.id and pp.status != 'LEFT') as participants,
       (select count(*) from prayer_checks c where c.prayer_id = p.id) as checks
     from prayers p join users u on u.id = p.owner_id
     where p.status != 'DELETED'
     order by p.created_at desc`,
  );
  if (prayers.length === 0) return [];

  // 참여자 명단 + 참여자별 기도 횟수
  const parts = await dbAll<{
    prayer_id: string;
    nickname: string | null;
    username: string | null;
    checked: number;
  }>(
    `select pp.prayer_id, u.nickname, u.username,
       (select count(*) from prayer_checks c where c.prayer_id = pp.prayer_id and c.user_id = pp.user_id) as checked
     from prayer_participants pp join users u on u.id = pp.user_id
     where pp.status != 'LEFT'`,
  );
  const byPrayer = new Map<string, AdminPrayerParticipant[]>();
  for (const p of parts) {
    const arr = byPrayer.get(p.prayer_id) ?? [];
    arr.push({ nickname: p.nickname, username: p.username, checkedCount: p.checked });
    byPrayer.set(p.prayer_id, arr);
  }

  return prayers.map((p) => ({
    prayerId: p.id,
    title: p.title,
    description: p.description,
    status: p.status,
    ownerName: p.owner_name,
    ownerUsername: p.owner_username,
    startDate: p.start_date,
    endDate: p.end_date,
    createdAt: p.created_at,
    participantCount: p.participants,
    checkCount: p.checks,
    participants: byPrayer.get(p.id) ?? [],
  }));
}
