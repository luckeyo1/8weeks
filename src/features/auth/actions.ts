"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getAuthUser } from "@/features/auth/service";
import { dbRun } from "@/lib/db";
import { SESSION_COOKIE } from "@/lib/auth/session";
import { AppError, toActionError, ok, type ActionResult } from "@/lib/errors";
import { onboardingSchema } from "./schema";

/** 온보딩: 닉네임 저장 (명세 5) */
export async function completeOnboarding(input: {
  nickname: string;
}): Promise<ActionResult> {
  try {
    const parsed = onboardingSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION", parsed.error.issues[0]?.message);
    }
    const uid = await getAuthUser();
    if (!uid) throw new AppError("UNAUTHENTICATED");

    const res = await dbRun(
      "update users set nickname = ?, updated_at = datetime('now') where id = ?",
      [parsed.data.nickname, uid],
    );
    // 행이 없으면(엣지 케이스) 생성
    if (!res.meta || res.meta.changes === 0) {
      await dbRun(
        "insert or ignore into users (id, nickname) values (?, ?)",
        [uid, parsed.data.nickname],
      );
    }

    revalidatePath("/home");
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

/** 로그아웃: 세션 쿠키 제거 */
export async function signOut(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
