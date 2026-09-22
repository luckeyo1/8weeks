import "server-only";

import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { MyProfile } from "@/types/domain";

/** 현재 로그인된 auth 사용자 (없으면 null) */
export async function getAuthUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** 현재 사용자의 프로필 (온보딩 완료 여부 판단) */
export async function getMyProfile(): Promise<MyProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users")
    .select("id, nickname, profile_image_url")
    .eq("id", user.id)
    .maybeSingle();

  if (!data) return null;
  return {
    id: data.id,
    nickname: data.nickname,
    profileImageUrl: data.profile_image_url,
  };
}

/**
 * 인증 + 온보딩 완료를 보장. (보호된 페이지에서 호출)
 * - 미로그인 → /login (returnUrl 유지)
 * - 로그인했으나 프로필 없음 → /onboarding
 */
export async function requireProfile(returnTo?: string): Promise<MyProfile> {
  const user = await getAuthUser();
  if (!user) {
    const q = returnTo ? `?returnUrl=${encodeURIComponent(returnTo)}` : "";
    redirect(`/login${q}`);
  }
  const profile = await getMyProfile();
  if (!profile) {
    redirect("/onboarding");
  }
  return profile;
}
