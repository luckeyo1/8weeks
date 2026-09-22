import "server-only";

import { createAdminClient } from "@/lib/supabase/server";
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

const RECENT_WINDOW_DAYS = 7;

/**
 * 데이터 접근 레이어 (명세 90/93).
 * service_role 클라이언트로 RLS 를 우회하되, 모든 함수는 호출자 userId 를
 * 받아 애플리케이션 레벨에서 권한을 필터링한다. (명세 31)
 *
 * ACTIVE 인데 종료일이 지난 기도는 조회 시점에 EXPIRED 로 지연 전환한다.
 * (cron 실패에도 상태가 꼬이지 않도록 — 명세 22)
 */

function buildShareUrl(token: string): string {
  return `${publicEnv.siteUrl}/join/${token}`;
}

/** ACTIVE→EXPIRED 지연 전환을 DB 에 반영 (best-effort) */
async function reconcileExpiry(prayers: PrayerRow[]): Promise<void> {
  const today = appTodayISO();
  const toExpire = prayers.filter(
    (p) => computeEffectiveStatus(p.status, p.end_date, today) === "EXPIRED" && p.status === "ACTIVE",
  );
  if (toExpire.length === 0) return;
  const admin = createAdminClient();
  await admin
    .from("prayers")
    .update({ status: "EXPIRED" })
    .in(
      "id",
      toExpire.map((p) => p.id),
    );
}

interface ProfileLite {
  nickname: string;
  profile_image_url: string | null;
}

async function fetchProfiles(
  userIds: string[],
): Promise<Map<string, ProfileLite>> {
  const map = new Map<string, ProfileLite>();
  if (userIds.length === 0) return map;
  const admin = createAdminClient();
  const { data } = await admin
    .from("users")
    .select("id, nickname, profile_image_url")
    .in("id", Array.from(new Set(userIds)));
  for (const u of data ?? []) {
    map.set(u.id, {
      nickname: u.nickname,
      profile_image_url: u.profile_image_url,
    });
  }
  return map;
}

function toUpdateView(row: PrayerUpdateRow): PrayerUpdateView {
  return {
    id: row.id,
    type: row.type,
    content: row.content,
    createdAt: row.created_at,
  };
}

/**
 * 내가 참여 중인(또는 참여했던) 기도제목 목록.
 * home = ACTIVE 만 / my-prayers "함께 기도 중" 탭 = 전체.
 */
export async function getParticipatingPrayers(
  userId: string,
): Promise<ParticipatingPrayer[]> {
  const admin = createAdminClient();
  const today = appTodayISO();

  const { data: participants } = await admin
    .from("prayer_participants")
    .select("id, prayer_id, status")
    .eq("user_id", userId)
    .neq("status", "LEFT");

  if (!participants || participants.length === 0) return [];

  const prayerIds = participants.map((p) => p.prayer_id);
  const { data: prayers } = await admin
    .from("prayers")
    .select("*")
    .in("id", prayerIds)
    .neq("status", "DELETED");

  const rows = (prayers ?? []) as PrayerRow[];
  await reconcileExpiry(rows);

  // 오늘 체크 여부
  const { data: todayChecks } = await admin
    .from("prayer_checks")
    .select("prayer_id")
    .eq("user_id", userId)
    .eq("check_date", today)
    .in("prayer_id", prayerIds);
  const checkedSet = new Set((todayChecks ?? []).map((c) => c.prayer_id));

  const profiles = await fetchProfiles(rows.map((p) => p.owner_id));
  const participantByPrayer = new Map(
    participants.map((p) => [p.prayer_id, p]),
  );

  return rows
    .map((p): ParticipatingPrayer => {
      const effective = computeEffectiveStatus(p.status, p.end_date, today);
      const owner = profiles.get(p.owner_id);
      const part = participantByPrayer.get(p.id)!;
      return {
        prayerId: p.id,
        owner: {
          nickname: owner?.nickname ?? "알 수 없음",
          profileImageUrl: owner?.profile_image_url ?? null,
        },
        title: p.title,
        description: p.description,
        startDate: p.start_date,
        endDate: p.end_date,
        status: effective,
        daysLeft: daysLeft(p.end_date, today),
        checkedToday: checkedSet.has(p.id),
        participantId: part.id,
        participantStatus: part.status,
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

/** 홈 "오늘 함께 기도할 사람" = 참여 중 + ACTIVE 만 (명세 18) */
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
  const admin = createAdminClient();
  const today = appTodayISO();

  const { data: prayers } = await admin
    .from("prayers")
    .select("*")
    .eq("owner_id", userId)
    .neq("status", "DELETED")
    .order("created_at", { ascending: false });

  const rows = (prayers ?? []) as PrayerRow[];
  await reconcileExpiry(rows);

  // 참여자 수 집계
  const ids = rows.map((r) => r.id);
  const countMap = new Map<string, number>();
  if (ids.length > 0) {
    const { data: parts } = await admin
      .from("prayer_participants")
      .select("prayer_id")
      .in("prayer_id", ids)
      .neq("status", "LEFT");
    for (const p of parts ?? []) {
      countMap.set(p.prayer_id, (countMap.get(p.prayer_id) ?? 0) + 1);
    }
  }

  return rows.map((p) => ({
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

/** 작성자용 상세 (owner 전용). 권한 없으면 예외. */
export async function getOwnerPrayerDetail(
  prayerId: string,
  userId: string,
): Promise<OwnerPrayerDetail> {
  const admin = createAdminClient();
  const today = appTodayISO();

  const { data: prayer } = await admin
    .from("prayers")
    .select("*")
    .eq("id", prayerId)
    .maybeSingle();

  if (!prayer || prayer.status === "DELETED") throw new AppError("NOT_FOUND");
  if (prayer.owner_id !== userId) throw new AppError("FORBIDDEN");

  await reconcileExpiry([prayer as PrayerRow]);

  const [{ count: participantCount }, { count: totalPrayerCount }, { data: updates }] =
    await Promise.all([
      admin
        .from("prayer_participants")
        .select("id", { count: "exact", head: true })
        .eq("prayer_id", prayerId)
        .neq("status", "LEFT"),
      // 이번 기간 aggregate 기도 횟수 (명세 55: 누가 몇번인지는 노출하지 않음)
      admin
        .from("prayer_checks")
        .select("id", { count: "exact", head: true })
        .eq("prayer_id", prayerId),
      admin
        .from("prayer_updates")
        .select("*")
        .eq("prayer_id", prayerId)
        .order("created_at", { ascending: false }),
    ]);

  return {
    prayerId: prayer.id,
    title: prayer.title,
    description: prayer.description,
    startDate: prayer.start_date,
    endDate: prayer.end_date,
    status: computeEffectiveStatus(prayer.status, prayer.end_date, today),
    daysLeft: daysLeft(prayer.end_date, today),
    participantCount: participantCount ?? 0,
    extensionCount: prayer.extension_count,
    shareToken: prayer.share_token,
    shareUrl: buildShareUrl(prayer.share_token),
    totalPrayerCount: totalPrayerCount ?? 0,
    updates: ((updates ?? []) as PrayerUpdateRow[]).map(toUpdateView),
    closedAt: prayer.closed_at,
  };
}

/** 참여자용 상세 (명세 20/28). 참여자가 아니면 예외. */
export async function getParticipantPrayerDetail(
  prayerId: string,
  userId: string,
): Promise<ParticipantPrayerDetail> {
  const admin = createAdminClient();
  const today = appTodayISO();

  const { data: part } = await admin
    .from("prayer_participants")
    .select("id, status")
    .eq("prayer_id", prayerId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!part || part.status === "LEFT") throw new AppError("FORBIDDEN");

  const { data: prayer } = await admin
    .from("prayers")
    .select("*")
    .eq("id", prayerId)
    .maybeSingle();
  if (!prayer || prayer.status === "DELETED") throw new AppError("NOT_FOUND");

  await reconcileExpiry([prayer as PrayerRow]);
  const effective = computeEffectiveStatus(prayer.status, prayer.end_date, today);

  // 오늘 체크 여부
  const { data: todayCheck } = await admin
    .from("prayer_checks")
    .select("id")
    .eq("prayer_id", prayerId)
    .eq("user_id", userId)
    .eq("check_date", today)
    .maybeSingle();

  // 지난 7일 중 함께 기도한 일수 (명세 20)
  const windowStart = addDaysISO(today, -(RECENT_WINDOW_DAYS - 1));
  const { data: recentChecks } = await admin
    .from("prayer_checks")
    .select("check_date")
    .eq("prayer_id", prayerId)
    .eq("user_id", userId)
    .gte("check_date", windowStart)
    .lte("check_date", today);
  const recentDays = new Set((recentChecks ?? []).map((c) => c.check_date)).size;

  // 종료 시 최신 업데이트
  let latestUpdate: PrayerUpdateView | null = null;
  if (effective !== "ACTIVE") {
    const { data: upd } = await admin
      .from("prayer_updates")
      .select("*")
      .eq("prayer_id", prayerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (upd) latestUpdate = toUpdateView(upd as PrayerUpdateRow);
  }

  const profiles = await fetchProfiles([prayer.owner_id]);
  const owner = profiles.get(prayer.owner_id);

  return {
    prayerId: prayer.id,
    owner: {
      nickname: owner?.nickname ?? "알 수 없음",
      profileImageUrl: owner?.profile_image_url ?? null,
    },
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

/** 특정 사용자가 이 기도의 owner 인지 (라우팅 분기용) */
export async function getViewerRelation(
  prayerId: string,
  userId: string,
): Promise<"OWNER" | "PARTICIPANT" | "NONE"> {
  const admin = createAdminClient();
  const { data: prayer } = await admin
    .from("prayers")
    .select("owner_id, status")
    .eq("id", prayerId)
    .maybeSingle();
  if (!prayer || prayer.status === "DELETED") return "NONE";
  if (prayer.owner_id === userId) return "OWNER";
  const { data: part } = await admin
    .from("prayer_participants")
    .select("status")
    .eq("prayer_id", prayerId)
    .eq("user_id", userId)
    .maybeSingle();
  if (part && part.status !== "LEFT") return "PARTICIPANT";
  return "NONE";
}

/**
 * shareToken 으로 join 미리보기 (비로그인 포함, 명세 13/32).
 * 민감정보(email/prayer id) 미노출. viewerId 없으면 GUEST.
 */
export async function getJoinPreview(
  shareToken: string,
  viewerId: string | null,
): Promise<JoinPreview> {
  const admin = createAdminClient();
  const today = appTodayISO();

  const { data: prayer } = await admin
    .from("prayers")
    .select("*")
    .eq("share_token", shareToken)
    .maybeSingle();

  if (!prayer) throw new AppError("INVALID_TOKEN");
  if (prayer.status === "DELETED") throw new AppError("PRAYER_DELETED");

  await reconcileExpiry([prayer as PrayerRow]);

  const effective = computeEffectiveStatus(
    prayer.status,
    prayer.end_date,
    today,
  );

  const profiles = await fetchProfiles([prayer.owner_id]);
  const owner = profiles.get(prayer.owner_id);

  // viewer 관계 판별
  let relation: JoinPreview["viewerRelation"] = viewerId ? "NONE" : "GUEST";
  if (viewerId) {
    if (prayer.owner_id === viewerId) {
      relation = "OWNER";
    } else {
      const { data: part } = await admin
        .from("prayer_participants")
        .select("status")
        .eq("prayer_id", prayer.id)
        .eq("user_id", viewerId)
        .maybeSingle();
      if (part && part.status !== "LEFT") relation = "PARTICIPANT";
    }
  }

  // 종료된 기도의 최신 업데이트 (참여자/작성자에게 결과 노출용, 명세 28)
  let latestUpdate: PrayerUpdateView | null = null;
  if (effective !== "ACTIVE") {
    const { data: upd } = await admin
      .from("prayer_updates")
      .select("*")
      .eq("prayer_id", prayer.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (upd) latestUpdate = toUpdateView(upd as PrayerUpdateRow);
  }

  return {
    shareToken,
    // 권한 있는 뷰어에게만 prayerId 노출
    prayerId:
      relation === "OWNER" || relation === "PARTICIPANT" ? prayer.id : null,
    owner: {
      nickname: owner?.nickname ?? "알 수 없음",
      profileImageUrl: owner?.profile_image_url ?? null,
    },
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
