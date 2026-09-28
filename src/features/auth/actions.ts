"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import {
  SESSION_COOKIE,
  createSessionToken,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getCfEnv } from "@/lib/cf";
import { dbFirst, dbRun, newId } from "@/lib/db";
import { publicEnv } from "@/lib/env";
import { AppError, toActionError, ok, type ActionResult } from "@/lib/errors";
import { signInSchema, signUpSchema } from "./schema";
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
}): Promise<ActionResult> {
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

    try {
      await dbRun(
        `insert into users (id, username, password_hash, nickname, church_name)
         values (?, ?, ?, ?, ?)`,
        [id, username, passwordHash, nickname, churchName ?? null],
      );
    } catch (e) {
      if (e instanceof Error && /UNIQUE|constraint/i.test(e.message)) {
        throw new AppError("VALIDATION", "이미 사용 중인 아이디예요.");
      }
      throw e;
    }

    await setSession(id);
    revalidatePath("/home");
    return ok(undefined);
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

/** 로그아웃 */
export async function signOut(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}
