"use server";

import { revalidatePath } from "next/cache";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { getMyProfile } from "@/features/auth/service";
import {
  AppError,
  toActionError,
  ok,
  type ActionResult,
} from "@/lib/errors";
import { appTodayISO } from "@/lib/date";
import { canJoin, computeEffectiveStatus } from "@/lib/status";
import { isValidShareTokenFormat } from "@/lib/token";

/**
 * 함께 기도하기 수락 (명세 17/66).
 * 서버에서 반드시 확인: prayer 존재 / DELETED 아님 / owner 아님 /
 * 중복 아님 / shareToken 유효 / 기간 종료 아님.
 */
export async function joinPrayer(
  shareToken: string,
): Promise<ActionResult<{ prayerId: string }>> {
  try {
    if (!isValidShareTokenFormat(shareToken)) {
      throw new AppError("INVALID_TOKEN");
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new AppError("UNAUTHENTICATED");
    const profile = await getMyProfile();
    if (!profile) throw new AppError("UNAUTHENTICATED");

    const admin = createAdminClient();
    const { data: prayer } = await admin
      .from("prayers")
      .select("*")
      .eq("share_token", shareToken)
      .maybeSingle();

    if (!prayer) throw new AppError("INVALID_TOKEN");
    if (prayer.status === "DELETED") throw new AppError("PRAYER_DELETED");
    if (prayer.owner_id === user.id) throw new AppError("OWN_PRAYER");

    const today = appTodayISO();
    const effective = computeEffectiveStatus(
      prayer.status,
      prayer.end_date,
      today,
    );
    if (!canJoin(effective)) throw new AppError("PRAYER_EXPIRED");

    // 이미 참여 중인지 (LEFT 였다면 재참여 허용 → ACTIVE 로 복구)
    const { data: existing } = await admin
      .from("prayer_participants")
      .select("id, status")
      .eq("prayer_id", prayer.id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      if (existing.status !== "LEFT") {
        throw new AppError("ALREADY_JOINED");
      }
      await admin
        .from("prayer_participants")
        .update({ status: "ACTIVE", left_at: null, joined_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      const { error } = await admin.from("prayer_participants").insert({
        prayer_id: prayer.id,
        user_id: user.id,
      });
      if (error) {
        // 동시요청으로 unique 위반 → 이미 참여 중
        if (error.code === "23505") throw new AppError("ALREADY_JOINED");
        throw new AppError("UNKNOWN");
      }
    }

    revalidatePath("/home");
    return ok({ prayerId: prayer.id });
  } catch (e) {
    return toActionError(e);
  }
}

/** 함께 기도 그만하기 (명세 34). checks 기록은 유지. */
export async function leavePrayer(
  prayerId: string,
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new AppError("UNAUTHENTICATED");

    const admin = createAdminClient();
    const { data: part } = await admin
      .from("prayer_participants")
      .select("id")
      .eq("prayer_id", prayerId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!part) throw new AppError("NOT_FOUND");

    await admin
      .from("prayer_participants")
      .update({ status: "LEFT", left_at: new Date().toISOString() })
      .eq("id", part.id);

    revalidatePath("/home");
    revalidatePath("/my-prayers");
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}
