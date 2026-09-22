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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new AppError("UNAUTHENTICATED");
  // 프로필(온보딩)까지 완료됐는지 보장 (owner_id FK = users)
  const profile = await getMyProfile();
  if (!profile) throw new AppError("UNAUTHENTICATED");
  return user.id;
}

/** owner 권한 확인 + 현재 row 반환 */
async function loadOwnedPrayer(
  prayerId: string,
  userId: string,
): Promise<PrayerRow> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("prayers")
    .select("*")
    .eq("id", prayerId)
    .maybeSingle();
  if (!data || data.status === "DELETED") throw new AppError("NOT_FOUND");
  if (data.owner_id !== userId) throw new AppError("FORBIDDEN");
  return data as PrayerRow;
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
    const admin = createAdminClient();

    // shareToken 충돌 대비 재시도
    let prayerId: string | null = null;
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const token = generateShareToken();
      const { data, error } = await admin
        .from("prayers")
        .insert({
          owner_id: userId,
          title: parsed.data.title,
          description: parsed.data.description ?? null,
          start_date: start,
          end_date: end,
          share_token: token,
        })
        .select("id")
        .single();
      if (!error && data) {
        prayerId = data.id;
        break;
      }
      // unique_violation(23505) 이면 토큰 재생성 후 재시도, 그 외엔 중단
      if (error && error.code !== "23505") throw new AppError("UNKNOWN");
    }
    if (!prayerId) throw new AppError("UNKNOWN");

    revalidatePath("/my-prayers");
    return ok({ prayerId });
  } catch (e) {
    return toActionError(e);
  }
}

/** 직접 마치기 = 지금 종료 (ACTIVE→EXPIRED) 후 정리 화면으로 (명세 10/23) */
export async function endPrayerNow(
  prayerId: string,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    const prayer = await loadOwnedPrayer(prayerId, userId);
    const today = appTodayISO();
    const effective = computeEffectiveStatus(
      prayer.status,
      prayer.end_date,
      today,
    );
    if (effective === "ACTIVE") {
      const admin = createAdminClient();
      // 종료일을 오늘로 당기고 EXPIRED 로
      await admin
        .from("prayers")
        .update({ status: "EXPIRED", end_date: today })
        .eq("id", prayerId);
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
    const effective = computeEffectiveStatus(
      prayer.status,
      prayer.end_date,
      today,
    );
    // 진행 중/종료 모두 연장 허용. 종료(ANSWERED/CLOSED/DELETED)는 불가.
    if (effective !== "ACTIVE" && effective !== "EXPIRED") {
      throw new AppError("VALIDATION", "지금은 연장할 수 없어요.");
    }
    if (effective === "EXPIRED") assertTransition("EXPIRED", "ACTIVE");

    // 연장은 절대 기간을 줄이지 않도록: 오늘과 기존 종료일 중 나중을 기준으로
    const base = prayer.end_date > today ? prayer.end_date : today;
    const newEnd = computeEndDate(base, parsed.data.durationDays);
    const admin = createAdminClient();
    await admin
      .from("prayers")
      .update({
        status: "ACTIVE",
        end_date: newEnd,
        extension_count: prayer.extension_count + 1,
        closed_at: null,
      })
      .eq("id", parsed.data.prayerId);

    await admin.from("prayer_updates").insert({
      prayer_id: parsed.data.prayerId,
      type: "EXTENDED",
    });

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
    if (!parsed.success) throw new AppError("VALIDATION", parsed.error.issues[0]?.message);

    await loadOwnedPrayer(parsed.data.prayerId, userId);
    const admin = createAdminClient();
    await admin.from("prayer_updates").insert({
      prayer_id: parsed.data.prayerId,
      type: "CHANGED",
      content: parsed.data.content,
    });
    await admin
      .from("prayers")
      .update({ status: "CLOSED", closed_at: new Date().toISOString() })
      .eq("id", parsed.data.prayerId);

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
    if (!parsed.success) throw new AppError("VALIDATION", parsed.error.issues[0]?.message);

    await loadOwnedPrayer(parsed.data.prayerId, userId);
    const admin = createAdminClient();
    await admin.from("prayer_updates").insert({
      prayer_id: parsed.data.prayerId,
      type: "ANSWERED",
      content: parsed.data.content ?? null,
    });
    await admin
      .from("prayers")
      .update({ status: "ANSWERED", closed_at: new Date().toISOString() })
      .eq("id", parsed.data.prayerId);

    revalidatePath(`/prayers/${parsed.data.prayerId}`);
    revalidatePath("/my-prayers");
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

/** 여기에서 마칠게요 = CLOSED (명세 27) */
export async function closePrayer(
  prayerId: string,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await loadOwnedPrayer(prayerId, userId);
    const admin = createAdminClient();
    await admin.from("prayer_updates").insert({
      prayer_id: prayerId,
      type: "CLOSED",
    });
    await admin
      .from("prayers")
      .update({ status: "CLOSED", closed_at: new Date().toISOString() })
      .eq("id", prayerId);

    revalidatePath(`/prayers/${prayerId}`);
    revalidatePath("/my-prayers");
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

/** 삭제 = soft delete (명세 33) */
export async function deletePrayer(
  prayerId: string,
): Promise<ActionResult> {
  try {
    const userId = await requireUserId();
    await loadOwnedPrayer(prayerId, userId);
    const admin = createAdminClient();
    await admin
      .from("prayers")
      .update({ status: "DELETED", closed_at: new Date().toISOString() })
      .eq("id", prayerId);

    revalidatePath("/my-prayers");
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}
