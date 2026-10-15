"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { generateRecoveryCode, normalizeRecoveryCode } from "@/lib/auth/recovery";
import { getCfEnv } from "@/lib/cf";
import { dbFirst, dbRun, newId } from "@/lib/db";
import { publicEnv } from "@/lib/env";
import { AppError, toActionError, ok, type ActionResult } from "@/lib/errors";
import { recoverSchema, signInSchema, signUpSchema } from "./schema";
import type { UserRow } from "@/types/db";

async function sessionSecret(): Promise<string> {
  const env = await getCfEnv();
  const secret = env.SESSION_SECRET ?? process.env.SESSION_SECRET;
  if (!secret) throw new AppError("UNKNOWN", "세션 설정이 필요합니다.");
  return secret;
}

async function setSession(uid: string): Promise<void> {
  const token = await createSessionToken(uid, await sessionSecret());
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions(publicEnv.siteUrl));
}

/** 회원가입 (아이디/비밀번호/이름/교회명) */
export async function signUp(input: {
  username: string;
  password: string;
  nickname: string;
  churchName?: string;
}): Promise<ActionResult<{ recoveryCode: string }>> {
  try {
    const parsed = signUpSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION", parsed.error.issues[0]?.message);
    }
    const { username, password, nickname, churchName } = parsed.data;

    // 아이디 중복 확인
    const existing = await dbFirst<{ id: string }>(
      "select id from users where username = ?",
      [username],
    );
    if (existing) {
      throw new AppError("VALIDATION", "이미 사용 중인 아이디예요.");
    }

    const id = newId();
    const passwordHash = await hashPassword(password);
    const recoveryCode = generateRecoveryCode();
    const recoveryHash = await hashPassword(normalizeRecoveryCode(recoveryCode));

    try {
      await dbRun(
        `insert into users (id, username, password_hash, nickname, church_name, recovery_code_hash)
         values (?, ?, ?, ?, ?, ?)`,
        [id, username, passwordHash, nickname, churchName ?? null, recoveryHash],
      );
    } catch (e) {
      if (e instanceof Error && /UNIQUE|constraint/i.test(e.message)) {
        throw new AppError("VALIDATION", "이미 사용 중인 아이디예요.");
      }
      throw e;
    }

    await setSession(id);
    revalidatePath("/home");
    // 복구 코드는 이 응답에서 1회만 전달된다(해시만 저장).
    return ok({ recoveryCode });
  } catch (e) {
    return toActionError(e);
  }
}

/** 로그인 (아이디/비밀번호) */
export async function signIn(input: {
  username: string;
  password: string;
}): Promise<ActionResult> {
  try {
    const parsed = signInSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION", parsed.error.issues[0]?.message);
    }

    const user = await dbFirst<UserRow>(
      "select * from users where username = ?",
      [parsed.data.username],
    );
    // 아이디/비번 구분 없이 동일 메시지 (열거 방지)
    const okPw =
      user && (await verifyPassword(parsed.data.password, user.password_hash));
    if (!user || !okPw) {
      throw new AppError("VALIDATION", "아이디 또는 비밀번호가 맞지 않아요.");
    }

    await setSession(user.id);
    revalidatePath("/home");
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

/**
 * 복구 코드로 비밀번호 재설정 (P1 자기복구).
 * 아이디 + 복구 코드가 맞으면 새 비밀번호를 설정하고 바로 로그인한다.
 * 코드 재사용을 막기 위해 재설정 후 복구 코드를 비운다(관리자 재발급 필요).
 */
export async function recoverAccount(input: {
  username: string;
  recoveryCode: string;
  newPassword: string;
}): Promise<ActionResult> {
  try {
    const parsed = recoverSchema.safeParse(input);
    if (!parsed.success) {
      throw new AppError("VALIDATION", parsed.error.issues[0]?.message);
    }

    const user = await dbFirst<UserRow>(
      "select * from users where username = ?",
      [parsed.data.username],
    );
    const okCode =
      user &&
      user.recovery_code_hash &&
      (await verifyPassword(
        normalizeRecoveryCode(parsed.data.recoveryCode),
        user.recovery_code_hash,
      ));
    // 아이디/코드 구분 없이 동일 메시지 (열거 방지)
    if (!user || !okCode) {
      throw new AppError("VALIDATION", "아이디 또는 복구 코드가 맞지 않아요.");
    }

    const newHash = await hashPassword(parsed.data.newPassword);
    await dbRun(
      "update users set password_hash = ?, recovery_code_hash = null, updated_at = datetime('now') where id = ?",
      [newHash, user.id],
    );

    await setSession(user.id);
    revalidatePath("/home");
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}

/** 로그아웃 */
export async function signOut(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/**
 * 회원 탈퇴 (P0 개인정보). 내가 만든 기도·함께한 기록을 모두 지우고 계정을 삭제한다.
 * 자식 행을 먼저 지워 참조 무결성을 지킨다(soft-delete 아님 — 완전 삭제).
 */
export async function deleteAccount(): Promise<ActionResult> {
  try {
    const store = await cookies();
    const token = store.get(SESSION_COOKIE)?.value;
    if (!token) throw new AppError("UNAUTHENTICATED");
    const { verifySessionToken } = await import("@/lib/auth/session");
    const uid = await verifySessionToken(token, await sessionSecret());
    if (!uid) throw new AppError("UNAUTHENTICATED");

    // 1) 내가 만든 기도제목에 달린 자식 행 정리
    await dbRun(
      "delete from prayer_checks where prayer_id in (select id from prayers where owner_id = ?)",
      [uid],
    );
    await dbRun(
      "delete from prayer_participants where prayer_id in (select id from prayers where owner_id = ?)",
      [uid],
    );
    await dbRun(
      "delete from prayer_updates where prayer_id in (select id from prayers where owner_id = ?)",
      [uid],
    );
    // 2) 내가 함께 기도한 다른 사람 기도의 기록 정리
    await dbRun("delete from prayer_checks where user_id = ?", [uid]);
    await dbRun("delete from prayer_participants where user_id = ?", [uid]);
    // 3) 내 기도제목, 세션, 계정 삭제
    await dbRun("delete from prayers where owner_id = ?", [uid]);
    await dbRun("delete from sessions where user_id = ?", [uid]);
    await dbRun("delete from users where id = ?", [uid]);

    store.delete(SESSION_COOKIE);
    return ok(undefined);
  } catch (e) {
    return toActionError(e);
  }
}
