import "server-only";

import { notFound } from "next/navigation";
import { getAuthUser } from "@/features/auth/service";
import { getCfEnv } from "@/lib/cf";
import { dbFirst } from "@/lib/db";

/**
 * 관리자 판별.
 * 1순위: users.is_admin = 1 (DB 플래그, 콘솔에서 켬)
 * 2순위: ADMIN_USERNAMES 환경변수 allowlist (콤마 구분)
 */
export async function isAdmin(): Promise<boolean> {
  const uid = await getAuthUser();
  if (!uid) return false;

  const row = await dbFirst<{ username: string | null; is_admin: number | null }>(
    "select username, is_admin from users where id = ?",
    [uid],
  );
  if (!row) return false;
  if (row.is_admin === 1) return true;

  // 보조: 환경변수 allowlist
  const env = await getCfEnv();
  const raw = env.ADMIN_USERNAMES ?? process.env.ADMIN_USERNAMES ?? "";
  const list = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return !!row.username && list.includes(row.username.toLowerCase());
}

/** 관리자가 아니면 404 (존재 자체를 숨김) */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) notFound();
}
