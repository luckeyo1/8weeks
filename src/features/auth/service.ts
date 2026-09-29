import "server-only";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { getCfEnv } from "@/lib/cf";
import { dbFirst } from "@/lib/db";
import type { MyProfile } from "@/types/domain";
import type { UserRow } from "@/types/db";

/** 세션 쿠키에서 현재 사용자 id (없거나 무효면 null) */
export async function getAuthUser(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const env = await getCfEnv();
  const secret = env.SESSION_SECRET ?? process.env.SESSION_SECRET;
  if (!secret) return null;
  return verifySessionToken(token, secret);
}

/** 온보딩 완료(닉네임 존재) 프로필. 미완료면 null */
export async function getMyProfile(): Promise<MyProfile | null> {
  const uid = await getAuthUser();
  if (!uid) return null;
  const row = await dbFirst<UserRow>(
    "select id, nickname, profile_image_url from users where id = ?",
    [uid],
  );
  if (!row || !row.nickname) return null;
  return {
    id: row.id,
    nickname: row.nickname,
    profileImageUrl: row.profile_image_url,
  };
}

/**
 * 인증 + 온보딩 완료 보장.
 * 미로그인 또는 프로필 없음 → /login
 */
export async function requireProfile(returnTo?: string): Promise<MyProfile> {
  const uid = await getAuthUser();
  if (!uid) {
    const q = returnTo ? `?returnUrl=${encodeURIComponent(returnTo)}` : "";
    redirect(`/login${q}`);
  }
  const profile = await getMyProfile();
  if (!profile) redirect("/login");
  return profile;
}
