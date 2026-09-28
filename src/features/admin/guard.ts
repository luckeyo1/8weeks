import "server-only";

import { notFound } from "next/navigation";
import { getAuthUser } from "@/features/auth/service";
import { getCfEnv } from "@/lib/cf";
import { dbFirst } from "@/lib/db";

/** 현재 로그인 사용자의 아이디 */
export async function getCurrentUsername(): Promise<string | null> {
  const uid = await getAuthUser();
  if (!uid) return null;
  const row = await dbFirst<{ username: string | null }>(
    "select username from users where id = ?",
    [uid],
  );
  return row?.username ?? null;
}

function adminList(env: CloudflareEnv): string[] {
  const raw = env.ADMIN_USERNAMES ?? process.env.ADMIN_USERNAMES ?? "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** 현재 사용자가 관리자면 true */
export async function isAdmin(): Promise<boolean> {
  const env = await getCfEnv();
  const list = adminList(env);
  if (list.length === 0) return false;
  const username = await getCurrentUsername();
  return !!username && list.includes(username.toLowerCase());
}

/** 관리자가 아니면 404 (존재 자체를 숨김) */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) notFound();
}
