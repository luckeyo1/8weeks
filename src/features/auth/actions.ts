"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { AppError, toActionError, ok, type ActionResult } from "@/lib/errors";
import { onboardingSchema } from "./schema";

/** 온보딩: 프로필 생성/갱신 (명세 5) */
export async function completeOnboarding(input: {
  nickname: string;
}): Promise<ActionResult> {
  try {
    const parsed = onboardingSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError(
        "VALIDATION",
        parsed.error.issues[0]?.message ?? undefined,
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new AppError("UNAUTHENTICATED");

    const { error } = await supabase.from("users").upsert(
      {
        id: user.id,
        email: user.email ?? null,
        nickname: parsed.data.nickname,
      },
      { onConflict: "id" },
    );
    if (error) throw new AppError("UNKNOWN");

    revalidatePath("/home");
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

/** 로그아웃 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
}
