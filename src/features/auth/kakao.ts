import "server-only";

import { getCfEnv } from "@/lib/cf";
import { dbFirst, dbRun, newId } from "@/lib/db";
import { publicEnv } from "@/lib/env";
import {
  KAKAO_API_BASE,
  KAKAO_AUTH_BASE,
  type KakaoConfig,
  type KakaoProfile,
} from "@/lib/auth/kakao";

/** 카카오 키가 없으면 null → 화면에서 카카오 버튼을 숨긴다(배포 순서와 무관하게 안전). */
export async function getKakaoConfig(): Promise<KakaoConfig | null> {
  const env = await getCfEnv();
  const pick = (key: keyof CloudflareEnv): string | null => {
    const v = (env[key] as string | undefined) ?? process.env[key];
    return v && v.trim() ? v.trim() : null;
  };
  const clientId = pick("KAKAO_REST_API_KEY");
  if (!clientId) return null;
  // 로컬 테스트용 가짜 카카오 서버 주소는 개발 모드에서만 허용
  const dev = process.env.NODE_ENV !== "production";
  return {
    clientId,
    clientSecret: pick("KAKAO_CLIENT_SECRET"),
    adminKey: pick("KAKAO_ADMIN_KEY"),
    redirectUri: `${publicEnv.siteUrl}/auth/kakao/callback`,
    authBase: (dev && pick("KAKAO_AUTH_BASE")) || KAKAO_AUTH_BASE,
    apiBase: (dev && pick("KAKAO_API_BASE")) || KAKAO_API_BASE,
  };
}

export async function isKakaoEnabled(): Promise<boolean> {
  return (await getKakaoConfig()) !== null;
}

/** 닉네임 동의가 없을 때 쓰는 이름 */
export const KAKAO_FALLBACK_NICKNAME = "카카오 친구";

/**
 * 카카오 회원번호로 계정을 찾고, 없으면 새로 만든다.
 * 이메일 등으로 기존 계정과 자동으로 합치지 않는다(계정 탈취 방지) — 기존 아이디 사용자는
 * 내 정보에서 직접 "카카오 연결"을 한다.
 */
export async function findOrCreateKakaoUser(
  profile: KakaoProfile,
): Promise<{ id: string; created: boolean }> {
  const existing = await dbFirst<{ id: string }>(
    "select id from users where kakao_id = ?",
    [profile.id],
  );
  if (existing) return { id: existing.id, created: false };

  const id = newId();
  try {
    await dbRun("insert into users (id, kakao_id, nickname) values (?, ?, ?)", [
      id,
      profile.id,
      profile.nickname ?? KAKAO_FALLBACK_NICKNAME,
    ]);
  } catch (e) {
    // 같은 카카오 계정으로 동시에 두 번 들어온 경우: 먼저 만들어진 계정을 쓴다
    if (e instanceof Error && /UNIQUE|constraint/i.test(e.message)) {
      const again = await dbFirst<{ id: string }>(
        "select id from users where kakao_id = ?",
        [profile.id],
      );
      if (again) return { id: again.id, created: false };
    }
    throw e;
  }
  return { id, created: true };
}

/** 현재 사용자에 카카오 계정 연결. 다른 계정에 이미 연결돼 있으면 "taken". */
export async function linkKakaoToUser(
  uid: string,
  profile: KakaoProfile,
): Promise<"linked" | "taken"> {
  const owner = await dbFirst<{ id: string }>(
    "select id from users where kakao_id = ?",
    [profile.id],
  );
  if (owner && owner.id !== uid) return "taken";
  await dbRun(
    "update users set kakao_id = ?, updated_at = datetime('now') where id = ?",
    [profile.id, uid],
  );
  return "linked";
}

/** 내 정보: 로그인 수단. kakaoLinked=null 이면 마이그레이션(0011_kakao_login) 전이라 카카오 연결을 숨긴다. */
export async function getLoginMethods(
  uid: string,
): Promise<{ kakaoLinked: boolean | null; hasPassword: boolean }> {
  try {
    const row = await dbFirst<{
      kakao_id: string | null;
      username: string | null;
    }>("select kakao_id, username from users where id = ?", [uid]);
    return {
      kakaoLinked: Boolean(row?.kakao_id),
      hasPassword: Boolean(row?.username),
    };
  } catch (e) {
    if (e instanceof Error && /no such column/i.test(e.message)) {
      return { kakaoLinked: null, hasPassword: true };
    }
    throw e;
  }
}
