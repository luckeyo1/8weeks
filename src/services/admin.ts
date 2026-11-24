import "server-only";

import { dbAll, dbCount, dbRun } from "@/lib/db";
import { appTodayISO } from "@/lib/date";
import { isMissingTableError } from "@/services/bible";
import type {
  AdminOverview,
  AdminPrayer,
  AdminPrayerParticipant,
  AdminReport,
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

/**
 * 처리 전(OPEN) 신고 목록. 오래된 것부터.
 * 신고 테이블(migrations/0010)이 아직 없으면 null — 화면에서 마이그레이션 안내를 보여준다.
 */
export async function getAdminReports(): Promise<AdminReport[] | null> {
  try {
    const rows = await dbAll<{
      id: string;
      prayer_id: string;
      title: string;
      description: string | null;
      owner_name: string | null;
      owner_username: string | null;
      reporter_name: string | null;
      reporter_username: string | null;
      reason: string;
      detail: string | null;
      created_at: string;
    }>(
      `select r.id, r.prayer_id, p.title, p.description,
         o.nickname as owner_name, o.username as owner_username,
         u.nickname as reporter_name, u.username as reporter_username,
         r.reason, r.detail, r.created_at
       from prayer_reports r
       join prayers p on p.id = r.prayer_id
       join users o on o.id = p.owner_id
       join users u on u.id = r.reporter_id
       where r.status = 'OPEN'
       order by r.created_at asc`,
    );
    return rows.map((r) => ({
      reportId: r.id,
      prayerId: r.prayer_id,
      prayerTitle: r.title,
      prayerDescription: r.description,
      ownerName: r.owner_name,
      ownerUsername: r.owner_username,
      reporterName: r.reporter_name,
      reporterUsername: r.reporter_username,
      reason: r.reason,
      detail: r.detail,
      createdAt: r.created_at,
    }));
  } catch (e) {
    if (isMissingTableError(e)) return null;
    throw e;
  }
}
