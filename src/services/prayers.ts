import "server-only";

import { dbAll, dbCount, dbFirst, dbRun } from "@/lib/db";
import { publicEnv } from "@/lib/env";
import { addDaysISO, appTodayISO, daysLeft } from "@/lib/date";
import { computeEffectiveStatus } from "@/lib/status";
import { AppError } from "@/lib/errors";
import type {
  JoinPreview,
  OwnedPrayerSummary,
  OwnerPrayerDetail,
  ParticipantPrayerDetail,
  ParticipatingPrayer,
  PrayerUpdateView,
} from "@/types/domain";
import type { PrayerRow, PrayerUpdateRow } from "@/types/db";

/**
 * 데이터 접근 레이어 (Cloudflare D1).
 * RLS 가 없으므로 모든 함수는 호출자 userId 를 받아 권한을 필터링한다.
 * ACTIVE 인데 종료일이 지난 기도는 조회 시점에 EXPIRED 로 지연 전환한다.
 */

const RECENT_WINDOW_DAYS = 7;

function buildShareUrl(token: string): string {
  return `${publicEnv.siteUrl}/join/${token}`;
}

function placeholders(n: number): string {
  return Array.from({ length: n }, () => "?").join(",");
}

/** ACTIVE→EXPIRED 지연 전환 (전역 best-effort, 명세 22) */
async function touchExpired(today: string): Promise<void> {
  await dbRun(
    "update prayers set status = 'EXPIRED', updated_at = datetime('now') where status = 'ACTIVE' and end_date < ?",
    [today],
  );
}

interface ProfileLite {
  id: string;
  nickname: string | null;
  profile_image_url: string | null;
}

async function fetchProfiles(
  userIds: string[],
): Promise<Map<string, ProfileLite>> {
  const map = new Map<string, ProfileLite>();
  const unique = Array.from(new Set(userIds));
  if (unique.length === 0) return map;
  const rows = await dbAll<ProfileLite>(
    `select id, nickname, profile_image_url from users where id in (${placeholders(unique.length)})`,
    unique,
  );
  for (const u of rows) map.set(u.id, u);
  return map;
}

function ownerProfile(p: ProfileLite | undefined) {
  return {
    nickname: p?.nickname ?? "알 수 없음",
    profileImageUrl: p?.profile_image_url ?? null,
  };
}

function toUpdateView(row: PrayerUpdateRow): PrayerUpdateView {
  return {
    id: row.id,
    type: row.type,
    content: row.content,
    createdAt: row.created_at,
  };
}

/** 내가 참여 중인(또는 참여했던) 기도제목 목록 */
export async function getParticipatingPrayers(
  userId: string,
): Promise<ParticipatingPrayer[]> {
  const today = appTodayISO();
  await touchExpired(today);

  const parts = await dbAll<{
    id: string;
    prayer_id: string;
    status: ParticipatingPrayer["participantStatus"];
  }>(
    "select id, prayer_id, status from prayer_participants where user_id = ? and status != 'LEFT'",
    [userId],
  );
  if (parts.length === 0) return [];

  const prayerIds = parts.map((p) => p.prayer_id);
  const prayers = await dbAll<PrayerRow>(
    `select * from prayers where id in (${placeholders(prayerIds.length)}) and status != 'DELETED'`,
    prayerIds,
  );

  const todayChecks = await dbAll<{ prayer_id: string }>(
    `select prayer_id from prayer_checks where user_id = ? and check_date = ? and prayer_id in (${placeholders(prayerIds.length)})`,
    [userId, today, ...prayerIds],
  );
  const checkedSet = new Set(todayChecks.map((c) => c.prayer_id));

  const profiles = await fetchProfiles(prayers.map((p) => p.owner_id));
  const partByPrayer = new Map(parts.map((p) => [p.prayer_id, p]));

  return prayers
    .map((p): ParticipatingPrayer => {
      const part = partByPrayer.get(p.id)!;
      return {
        prayerId: p.id,
        owner: ownerProfile(profiles.get(p.owner_id)),
        title: p.title,
        description: p.description,
        startDate: p.start_date,
        endDate: p.end_date,
        status: computeEffectiveStatus(p.status, p.end_date, today),
        daysLeft: daysLeft(p.end_date, today),
        checkedToday: checkedSet.has(p.id),
        participantId: part.id,
        participantStatus: part.status,
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

/** 홈 "오늘 함께 기도할 사람" = 참여 중 + ACTIVE (명세 18) */
export async function getTodaysPrayers(
  userId: string,
): Promise<ParticipatingPrayer[]> {
  const all = await getParticipatingPrayers(userId);
  return all.filter((p) => p.status === "ACTIVE");
}

/** 내가 작성한 기도제목 목록 */
export async function getOwnedPrayers(
  userId: string,
): Promise<OwnedPrayerSummary[]> {
  const today = appTodayISO();
  await touchExpired(today);

  const prayers = await dbAll<PrayerRow>(
    "select * from prayers where owner_id = ? and status != 'DELETED' order by created_at desc",
    [userId],
  );
  if (prayers.length === 0) return [];

  const ids = prayers.map((p) => p.id);
  const counts = await dbAll<{ prayer_id: string; n: number }>(
    `select prayer_id, count(*) as n from prayer_participants where prayer_id in (${placeholders(ids.length)}) and status != 'LEFT' group by prayer_id`,
    ids,
  );
  const countMap = new Map(counts.map((c) => [c.prayer_id, c.n]));

  return prayers.map((p) => ({
    prayerId: p.id,
    title: p.title,
    description: p.description,
    startDate: p.start_date,
    endDate: p.end_date,
    status: computeEffectiveStatus(p.status, p.end_date, today),
    daysLeft: daysLeft(p.end_date, today),
    participantCount: countMap.get(p.id) ?? 0,
    extensionCount: p.extension_count,
  }));
}

/** 작성자용 상세 (owner 전용) */
export async function getOwnerPrayerDetail(
  prayerId: string,
  userId: string,
): Promise<OwnerPrayerDetail> {
  const today = appTodayISO();
  await touchExpired(today);

  const prayer = await dbFirst<PrayerRow>(
    "select * from prayers where id = ?",
    [prayerId],
  );
  if (!prayer || prayer.status === "DELETED") throw new AppError("NOT_FOUND");
  if (prayer.owner_id !== userId) throw new AppError("FORBIDDEN");

  const participantCount = await dbCount(
    "select count(*) as n from prayer_participants where prayer_id = ? and status != 'LEFT'",
    [prayerId],
  );
  const totalPrayerCount = await dbCount(
    "select count(*) as n from prayer_checks where prayer_id = ?",
    [prayerId],
  );
  const updates = await dbAll<PrayerUpdateRow>(
    "select * from prayer_updates where prayer_id = ? order by created_at desc",
    [prayerId],
  );

  return {
    prayerId: prayer.id,
    title: prayer.title,
    description: prayer.description,
    startDate: prayer.start_date,
    endDate: prayer.end_date,
    status: computeEffectiveStatus(prayer.status, prayer.end_date, today),
    daysLeft: daysLeft(prayer.end_date, today),
    participantCount,
    extensionCount: prayer.extension_count,
    shareToken: prayer.share_token,
    shareUrl: buildShareUrl(prayer.share_token),
    totalPrayerCount,
    updates: updates.map(toUpdateView),
    closedAt: prayer.closed_at,
  };
}

/** 참여자용 상세 (명세 20/28) */
export async function getParticipantPrayerDetail(
  prayerId: string,
  userId: string,
): Promise<ParticipantPrayerDetail> {
  const today = appTodayISO();
  await touchExpired(today);

  const part = await dbFirst<{
    id: string;
    status: ParticipantPrayerDetail["participantStatus"];
  }>(
    "select id, status from prayer_participants where prayer_id = ? and user_id = ?",
    [prayerId, userId],
  );
  if (!part || part.status === "LEFT") throw new AppError("FORBIDDEN");

  const prayer = await dbFirst<PrayerRow>(
    "select * from prayers where id = ?",
    [prayerId],
  );
  if (!prayer || prayer.status === "DELETED") throw new AppError("NOT_FOUND");

  const effective = computeEffectiveStatus(prayer.status, prayer.end_date, today);

  const todayCheck = await dbFirst<{ id: string }>(
    "select id from prayer_checks where prayer_id = ? and user_id = ? and check_date = ?",
    [prayerId, userId, today],
  );

  const windowStart = addDaysISO(today, -(RECENT_WINDOW_DAYS - 1));
  const recentChecks = await dbAll<{ check_date: string }>(
    "select check_date from prayer_checks where prayer_id = ? and user_id = ? and check_date >= ? and check_date <= ?",
    [prayerId, userId, windowStart, today],
  );
  const recentDays = new Set(recentChecks.map((c) => c.check_date)).size;

  let latestUpdate: PrayerUpdateView | null = null;
  if (effective !== "ACTIVE") {
    const upd = await dbFirst<PrayerUpdateRow>(
      "select * from prayer_updates where prayer_id = ? order by created_at desc limit 1",
      [prayerId],
    );
    if (upd) latestUpdate = toUpdateView(upd);
  }

  const profiles = await fetchProfiles([prayer.owner_id]);

  return {
    prayerId: prayer.id,
    owner: ownerProfile(profiles.get(prayer.owner_id)),
    title: prayer.title,
    description: prayer.description,
    startDate: prayer.start_date,
    endDate: prayer.end_date,
    status: effective,
    daysLeft: daysLeft(prayer.end_date, today),
    checkedToday: Boolean(todayCheck),
    participantId: part.id,
    participantStatus: part.status,
    recentDays,
    recentWindow: RECENT_WINDOW_DAYS,
    latestUpdate,
  };
}

/** 라우팅 분기용 관계 판별 */
export async function getViewerRelation(
  prayerId: string,
  userId: string,
): Promise<"OWNER" | "PARTICIPANT" | "NONE"> {
  const prayer = await dbFirst<{ owner_id: string; status: string }>(
    "select owner_id, status from prayers where id = ?",
    [prayerId],
  );
  if (!prayer || prayer.status === "DELETED") return "NONE";
  if (prayer.owner_id === userId) return "OWNER";
  const part = await dbFirst<{ status: string }>(
    "select status from prayer_participants where prayer_id = ? and user_id = ?",
    [prayerId, userId],
  );
  if (part && part.status !== "LEFT") return "PARTICIPANT";
  return "NONE";
}

/** shareToken join 미리보기 (비로그인 포함, 명세 13/32) */
export async function getJoinPreview(
  shareToken: string,
  viewerId: string | null,
): Promise<JoinPreview> {
  const today = appTodayISO();

  const prayer = await dbFirst<PrayerRow>(
    "select * from prayers where share_token = ?",
    [shareToken],
  );
  if (!prayer) throw new AppError("INVALID_TOKEN");
  if (prayer.status === "DELETED") throw new AppError("PRAYER_DELETED");

  await touchExpired(today);
  const effective = computeEffectiveStatus(prayer.status, prayer.end_date, today);

  let relation: JoinPreview["viewerRelation"] = viewerId ? "NONE" : "GUEST";
  if (viewerId) {
    if (prayer.owner_id === viewerId) {
      relation = "OWNER";
    } else {
      const part = await dbFirst<{ status: string }>(
        "select status from prayer_participants where prayer_id = ? and user_id = ?",
        [prayer.id, viewerId],
      );
      if (part && part.status !== "LEFT") relation = "PARTICIPANT";
    }
  }

  let latestUpdate: PrayerUpdateView | null = null;
  if (effective !== "ACTIVE") {
    const upd = await dbFirst<PrayerUpdateRow>(
      "select * from prayer_updates where prayer_id = ? order by created_at desc limit 1",
      [prayer.id],
    );
    if (upd) latestUpdate = toUpdateView(upd);
  }

  const profiles = await fetchProfiles([prayer.owner_id]);

  return {
    shareToken,
    prayerId:
      relation === "OWNER" || relation === "PARTICIPANT" ? prayer.id : null,
    owner: ownerProfile(profiles.get(prayer.owner_id)),
    title: prayer.title,
    description: prayer.description,
    startDate: prayer.start_date,
    endDate: prayer.end_date,
    status: effective,
    daysLeft: daysLeft(prayer.end_date, today),
    viewerRelation: relation,
    latestUpdate,
  };
}
