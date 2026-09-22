"use server";

import { revalidatePath } from "next/cache";
import { getAuthUser, getMyProfile } from "@/features/auth/service";
import { dbFirst, dbRun, newId } from "@/lib/db";
import { AppError, toActionError, ok, type ActionResult } from "@/lib/errors";
import { appTodayISO } from "@/lib/date";
import { canJoin, computeEffectiveStatus } from "@/lib/status";
import { isValidShareTokenFormat } from "@/lib/token";
import type { PrayerRow } from "@/types/db";

/** 함께 기도하기 수락 (명세 17/66) */
export async function joinPrayer(
  shareToken: string,
): Promise<ActionResult<{ prayerId: string }>> {
  try {
    if (!isValidShareTokenFormat(shareToken)) {
      throw new AppError("INVALID_TOKEN");
    }
    const uid = await getAuthUser();
    if (!uid) throw new AppError("UNAUTHENTICATED");
    const profile = await getMyProfile();
    if (!profile) throw new AppError("UNAUTHENTICATED");

    const prayer = await dbFirst<PrayerRow>(
      "select * from prayers where share_token = ?",
      [shareToken],
    );
    if (!prayer) throw new AppError("INVALID_TOKEN");
    if (prayer.status === "DELETED") throw new AppError("PRAYER_DELETED");
    if (prayer.owner_id === uid) throw new AppError("OWN_PRAYER");

    const today = appTodayISO();
    const effective = computeEffectiveStatus(prayer.status, prayer.end_date, today);
    if (!canJoin(effective)) throw new AppError("PRAYER_EXPIRED");

    const existing = await dbFirst<{ id: string; status: string }>(
      "select id, status from prayer_participants where prayer_id = ? and user_id = ?",
      [prayer.id, uid],
    );

    if (existing) {
      if (existing.status !== "LEFT") throw new AppError("ALREADY_JOINED");
      await dbRun(
        "update prayer_participants set status = 'ACTIVE', left_at = null, joined_at = datetime('now') where id = ?",
        [existing.id],
      );
    } else {
      try {
        await dbRun(
          "insert into prayer_participants (id, prayer_id, user_id, status) values (?, ?, ?, 'ACTIVE')",
          [newId(), prayer.id, uid],
        );
      } catch (e) {
        // 동시요청 unique 위반 → 이미 참여 중
        if (e instanceof Error && /UNIQUE|constraint/i.test(e.message)) {
          throw new AppError("ALREADY_JOINED");
        }
        throw e;
      }
    }

    revalidatePath("/home");
    return ok({ prayerId: prayer.id });
  } catch (e) {
    return toActionError(e);
  }
}

/** 함께 기도 그만하기 (명세 34). checks 기록은 유지 */
export async function leavePrayer(prayerId: string): Promise<ActionResult> {
  try {
    const uid = await getAuthUser();
    if (!uid) throw new AppError("UNAUTHENTICATED");

    const part = await dbFirst<{ id: string }>(
      "select id from prayer_participants where prayer_id = ? and user_id = ?",
      [prayerId, uid],
    );
    if (!part) throw new AppError("NOT_FOUND");

    await dbRun(
      "update prayer_participants set status = 'LEFT', left_at = datetime('now') where id = ?",
      [part.id],
    );

    revalidatePath("/home");
    revalidatePath("/my-prayers");
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}
