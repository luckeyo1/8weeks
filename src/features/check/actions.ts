"use server";

import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/features/auth/service";
import { dbFirst, dbRun, newId } from "@/lib/db";
import { AppError, toActionError, ok, type ActionResult } from "@/lib/errors";
import { appTodayISO } from "@/lib/date";
import { canCheck, computeEffectiveStatus } from "@/lib/status";

/**
 * 오늘 함께 기도했어요 체크 (명세 8/19/67/68).
 * 서버 확인: participant ACTIVE / prayer ACTIVE / 오늘 기존 check 없음.
 * 동일 날짜 중복은 unique(prayer_id,user_id,check_date) 로 최종 차단.
 */
export async function checkPrayer(
  prayerId: string,
): Promise<ActionResult<{ checkedToday: true }>> {
  try {
    const uid = await getAuthUser();
    if (!uid) throw new AppError("UNAUTHENTICATED");

    const prayer = await dbFirst<{
      owner_id: string;
      status: string;
      end_date: string;
    }>("select owner_id, status, end_date from prayers where id = ?", [prayerId]);
    if (!prayer || prayer.status === "DELETED") throw new AppError("NOT_FOUND");

    // 작성자 본인 또는 (LEFT 아닌) 참여자만 체크 가능
    const part = await dbFirst<{ id: string; status: string }>(
      "select id, status from prayer_participants where prayer_id = ? and user_id = ?",
      [prayerId, uid],
    );
    const isOwner = prayer.owner_id === uid;
    const isParticipant = part && part.status !== "LEFT";
    if (!isOwner && !isParticipant) throw new AppError("FORBIDDEN");

    const today = appTodayISO();
    const effective = computeEffectiveStatus(
      prayer.status as "ACTIVE",
      prayer.end_date,
      today,
    );
    if (!canCheck(effective)) throw new AppError("PRAYER_EXPIRED");

    try {
      await dbRun(
        "insert into prayer_checks (id, prayer_id, participant_id, user_id, check_date) values (?, ?, ?, ?, ?)",
        [newId(), prayerId, isParticipant ? part!.id : null, uid, today],
      );
    } catch (e) {
      // 동일 날짜 중복 → 멱등 처리
      if (e instanceof Error && /UNIQUE|constraint/i.test(e.message)) {
        return ok({ checkedToday: true });
      }
      throw e;
    }

    revalidatePath("/home");
    return ok({ checkedToday: true });
  } catch (e) {
    return toActionError(e);
  }
}
