import "server-only";

import { notFound } from "next/navigation";
import { getAuthUser } from "@/features/auth/service";
import { getCfEnv } from "@/lib/cf";
import { dbFirst } from "@/lib/db";

/**
 * 기본 관리자 아이디 (코드 고정).
 * 추가 관리자는 users.is_admin=1 또는 ADMIN_USERNAMES 환경변수로 지정.
 */
const DEFAULT_ADMINS = ["luckeyo"];

/**
 * 관리자 판별 (견고 버전).
 * 1) username 조회(필수 컬럼) → DEFAULT_ADMINS / ADMIN_USERNAMES 매칭
 * 2) users.is_admin=1 (컬럼이 있을 때만, 없으면 조용히 무시)
 * 어떤 조회가 실패해도 화면이 깨지지 않도록 방어.
 */
export async function isAdmin(): Promise<boolean> {
  const uid = await getAuthUser();
  if (!uid) return false;

  let username: string | null = null;
  try {
    const row = await dbFirst<{ username: string | null }>(
      "select username from users where id = ?",
      [uid],
    );
    username = row?.username ?? null;
  } catch {
    return false;
  }
  if (!username) return false;
  const uname = username.toLowerCase();

  if (DEFAULT_ADMINS.includes(uname)) return true;

  // 환경변수 allowlist (보조)
  try {
    const env = await getCfEnv();
    const raw = env.ADMIN_USERNAMES ?? process.env.ADMIN_USERNAMES ?? "";
    const list = raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (list.includes(uname)) return true;
  } catch {
    /* 무시 */
  }

  // DB 플래그 (is_admin 컬럼이 있을 때만)
  try {
    const row = await dbFirst<{ is_admin: number | null }>(
      "select is_admin from users where id = ?",
      [uid],
    );
    if (row?.is_admin === 1) return true;
  } catch {
    /* is_admin 컬럼 미적용 → 무시 */
  }

  return false;
}

/** 관리자가 아니면 404 (존재 자체를 숨김) */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) notFound();
}
