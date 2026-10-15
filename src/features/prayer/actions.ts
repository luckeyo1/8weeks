"use server";

import { revalidatePath } from "next/cache";
import { getAuthUser, getMyProfile } from "@/features/auth/service";
import { dbFirst, dbRun, newId } from "@/lib/db";
import { AppError, toActionError, ok, type ActionResult } from "@/lib/errors";
import { generateShareToken } from "@/lib/token";
import { appTodayISO, computeEndDate } from "@/lib/date";
import { assertTransition, computeEffectiveStatus } from "@/lib/status";
import type { PrayerRow } from "@/types/db";
import {
  answerPrayerSchema,
  changePrayerSchema,
  createPrayerSchema,
  extendPrayerSchema,
} from "./schema";

async function requireUserId(): Promise<string> {
  const uid = await getAuthUser();
  if (!uid) throw new AppError("UNAUTHENTICATED");
  const profile = await getMyProfile();
  if (!profile) throw new AppError("UNAUTHENTICATED");
  return uid;
}

async function loadOwnedPrayer(
  prayerId: string,
  userId: string,
): Promise<PrayerRow> {
  const row = await dbFirst<PrayerRow>("select * from prayers where id = ?", [
    prayerId,
  ]);
  if (!row || row.status === "DELETED") throw new AppError("NOT_FOUND");
  if (row.owner_id !== userId) throw new AppError("FORBIDDEN");
  return row;
}

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Error && /UNIQUE|constraint/i.test(e.message);
}

/** 기도제목 생성 (명세 9/11) */
export async function createPrayer(input: {
  title: string;
  description?: string;
  durationDays: number;
}): Promise<ActionResult<{ prayerId: string }>> {
  try {
    const userId = await requireUserId();
    const parsed = createPrayerSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION", parsed.error.issues[0]?.message);
    }

    const start = appTodayISO();
    const end = computeEndDate(start, parsed.data.durationDays);
    const prayerId = newId();

    let inserted = false;
    for (let attempt = 0; attempt < 3 && !inserted; attempt += 1) {
      try {
        await dbRun(
          `insert into prayers (id, owner_id, title, description, status, start_date, end_date, share_token, extension_count)
           values (?, ?, ?, ?, 'ACTIVE', ?, ?, ?, 0)`,
          [
            prayerId,
            userId,
            parsed.data.title,
            parsed.data.description ?? null,
            start,
            end,
            generateShareToken(),
          ],
        );
        inserted = true;
      } catch (e) {
        // share_token 충돌이면 재시도, 그 외엔 중단
        if (!isUniqueViolation(e)) throw e;
      }
    }
    if (!inserted) throw new AppError("UNKNOWN");

    revalidatePath("/my-prayers");
    return ok({ prayerId });
  } catch (e) {
    return toActionError(e);
  }
}

/** 직접 마치기 = 지금 종료 (ACTIVE→EXPIRED) 후 정리 화면 (명세 10/23) */
export async function endPrayerNow(prayerId: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const prayer = await loadOwnedPrayer(prayerId, userId);
    const today = appTodayISO();
    const effective = computeEffectiveStatus(prayer.status, prayer.end_date, today);
    if (effective === "ACTIVE") {
      await dbRun(
        "update prayers set status = 'EXPIRED', end_date = ?, updated_at = datetime('now') where id = ?",
        [today, prayerId],
      );
    }
    revalidatePath(`/prayers/${prayerId}`);
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

/** 조금 더 기도가 필요해요 = 연장 (명세 24) */
export async function extendPrayer(input: {
  prayerId: string;
  durationDays: number;
}): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const parsed = extendPrayerSchema.safeParse(input);
    if (!parsed.success) throw new AppError("VALIDATION");

    const prayer = await loadOwnedPrayer(parsed.data.prayerId, userId);
    const today = appTodayISO();
    const effective = computeEffectiveStatus(prayer.status, prayer.end_date, today);
    if (effective !== "ACTIVE" && effective !== "EXPIRED") {
      throw new AppError("VALIDATION", "지금은 연장할 수 없어요.");
    }
    if (effective === "EXPIRED") assertTransition("EXPIRED", "ACTIVE");

    const base = prayer.end_date > today ? prayer.end_date : today;
    const newEnd = computeEndDate(base, parsed.data.durationDays);

    await dbRun(
      "update prayers set status = 'ACTIVE', end_date = ?, extension_count = extension_count + 1, closed_at = null, updated_at = datetime('now') where id = ?",
      [newEnd, parsed.data.prayerId],
    );
    await dbRun(
      "insert into prayer_updates (id, prayer_id, type) values (?, ?, 'EXTENDED')",
      [newId(), parsed.data.prayerId],
    );

    revalidatePath(`/prayers/${parsed.data.prayerId}`);
    revalidatePath("/my-prayers");
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

/** 변화가 있었어요 = CHANGED 업데이트 + CLOSED (명세 25/28) */
export async function recordChange(input: {
  prayerId: string;
  content: string;
}): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const parsed = changePrayerSchema.safeParse(input);
    if (!parsed.success)
      throw new AppError("VALIDATION", parsed.error.issues[0]?.message);

    await loadOwnedPrayer(parsed.data.prayerId, userId);
    await dbRun(
      "insert into prayer_updates (id, prayer_id, type, content) values (?, ?, 'CHANGED', ?)",
      [newId(), parsed.data.prayerId, parsed.data.content],
    );
    await dbRun(
      "update prayers set status = 'CLOSED', closed_at = datetime('now'), updated_at = datetime('now') where id = ?",
      [parsed.data.prayerId],
    );

    revalidatePath(`/prayers/${parsed.data.prayerId}`);
    revalidatePath("/my-prayers");
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

/** 응답을 경험했어요 = ANSWERED (명세 26) */
export async function recordAnswer(input: {
  prayerId: string;
  content?: string;
}): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const parsed = answerPrayerSchema.safeParse(input);
    if (!parsed.success)
      throw new AppError("VALIDATION", parsed.error.issues[0]?.message);

    await loadOwnedPrayer(parsed.data.prayerId, userId);
    await dbRun(
      "insert into prayer_updates (id, prayer_id, type, content) values (?, ?, 'ANSWERED', ?)",
      [newId(), parsed.data.prayerId, parsed.data.content ?? null],
    );
    await dbRun(
      "update prayers set status = 'ANSWERED', closed_at = datetime('now'), updated_at = datetime('now') where id = ?",
      [parsed.data.prayerId],
    );

    revalidatePath(`/prayers/${parsed.data.prayerId}`);
    revalidatePath("/my-prayers");
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

/** 여기에서 마칠게요 = CLOSED (명세 27) */
export async function closePrayer(prayerId: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await loadOwnedPrayer(prayerId, userId);
    await dbRun(
      "insert into prayer_updates (id, prayer_id, type) values (?, ?, 'CLOSED')",
      [newId(), prayerId],
    );
    await dbRun(
      "update prayers set status = 'CLOSED', closed_at = datetime('now'), updated_at = datetime('now') where id = ?",
      [prayerId],
    );

    revalidatePath(`/prayers/${prayerId}`);
    revalidatePath("/my-prayers");
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

/** 삭제 = soft delete (명세 33) */
export async function deletePrayer(prayerId: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await loadOwnedPrayer(prayerId, userId);
    await dbRun(
      "update prayers set status = 'DELETED', closed_at = datetime('now'), updated_at = datetime('now') where id = ?",
      [prayerId],
    );
    revalidatePath("/my-prayers");
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

/**
 * 초대 링크 잠그기 (P0 접근권한). 기존 링크로 신규 수락을 차단한다.
 * 이미 함께 기도 중인 동행자에게는 영향 없음.
 */
export async function revokeShareLink(prayerId: string): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await loadOwnedPrayer(prayerId, userId);
    await dbRun(
      "update prayers set share_revoked = 1, updated_at = datetime('now') where id = ?",
      [prayerId],
    );
    revalidatePath(`/prayers/${prayerId}`);
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

/**
 * 초대 링크 새로 만들기 (P0 접근권한). 새 토큰을 발급하고 잠금을 해제한다.
 * 기존에 공유했던 링크는 더 이상 열리지 않는다.
 */
export async function reissueShareLink(
  prayerId: string,
): Promise<ActionResult<{ shareToken: string }>> {
  try {
    const userId = await requireUserId();
    await loadOwnedPrayer(prayerId, userId);

    let token = "";
    let updated = false;
    for (let attempt = 0; attempt < 3 && !updated; attempt += 1) {
      token = generateShareToken();
      try {
        await dbRun(
          "update prayers set share_token = ?, share_revoked = 0, updated_at = datetime('now') where id = ?",
          [token, prayerId],
        );
        updated = true;
      } catch (e) {
        if (!isUniqueViolation(e)) throw e;
      }
    }
    if (!updated) throw new AppError("UNKNOWN");

    revalidatePath(`/prayers/${prayerId}`);
    return ok({ shareToken: token });
  } catch (e) {
    return toActionError(e);
  }
}

/**
 * 동행자 접근 해제 (P0 접근권한). 특정 동행자의 접근을 끊는다.
 * 지난 기록(prayer_checks)은 유지하고, 재참여는 차단한다(removed=1).
 */
export async function removeParticipant(input: {
  prayerId: string;
  participantId: string;
}): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await loadOwnedPrayer(input.prayerId, userId);

    const part = await dbFirst<{ id: string }>(
      "select id from prayer_participants where id = ? and prayer_id = ?",
      [input.participantId, input.prayerId],
    );
    if (!part) throw new AppError("NOT_FOUND");

    await dbRun(
      "update prayer_participants set status = 'LEFT', removed = 1, left_at = datetime('now') where id = ?",
      [part.id],
    );

    revalidatePath(`/prayers/${input.prayerId}`);
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}
