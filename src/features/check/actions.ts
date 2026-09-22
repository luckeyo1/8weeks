"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import {
  AppError,
  toActionError,
  ok,
  type ActionResult,
} from "@/lib/errors";
import { appTodayISO } from "@/lib/date";
import { canCheck, computeEffectiveStatus } from "@/lib/status";

/**
 * 오늘 함께 기도했어요 체크 (명세 8/19/67/68).
 * 서버에서 확인: participant ACTIVE / prayer ACTIVE / 오늘 기존 check 없음.
 * 동일 날짜 중복은 DB unique(prayer_id,user_id,check_date) 로 최종 차단.
 */
export async function checkPrayer(
  prayerId: string,
): Promise<ActionResult<{ checkedToday: true }>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new AppError("UNAUTHENTICATED");

    const admin = createAdminClient();

    // 참여 정보 (ACTIVE 여야 함)
    const { data: part } = await admin
      .from("prayer_participants")
      .select("id, status")
      .eq("prayer_id", prayerId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!part || part.status === "LEFT") throw new AppError("FORBIDDEN");

    // 기도 상태 (ACTIVE 여야 함)
    const { data: prayer } = await admin
      .from("prayers")
      .select("status, end_date")
      .eq("id", prayerId)
      .maybeSingle();
    if (!prayer || prayer.status === "DELETED") throw new AppError("NOT_FOUND");

    const today = appTodayISO();
    const effective = computeEffectiveStatus(
      prayer.status,
      prayer.end_date,
      today,
    );
    if (!canCheck(effective)) throw new AppError("PRAYER_EXPIRED");

    const { error } = await admin.from("prayer_checks").insert({
      prayer_id: prayerId,
      participant_id: part.id,
      user_id: user.id,
      check_date: today,
    });

    if (error) {
      // 동일 날짜 중복 (unique_violation) → 이미 오늘 체크함(멱등 처리)
      if (error.code === "23505") return ok({ checkedToday: true });
      throw new AppError("UNKNOWN");
    }

    revalidatePath("/home");
    return ok({ checkedToday: true });
  } catch (e) {
    return toActionError(e);
  }
}
