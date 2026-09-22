/**
 * 환경변수 접근을 한 곳으로 모읍니다. (명세 97)
 * SUPABASE_SERVICE_ROLE_KEY 는 서버에서만 읽어야 하며 절대 client bundle 에
 * 포함되면 안 됩니다. (NEXT_PUBLIC_ 접두사가 없으므로 클라이언트 번들 제외)
 */

function required(name: string, value: string | undefined): string {
  if (!value || value.length === 0) {
    throw new Error(
      `환경변수 ${name} 가 설정되지 않았습니다. .env.local 을 확인해주세요.`,
    );
  }
  return value;
}

export const publicEnv = {
  supabaseUrl: required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ),
  supabaseAnonKey: required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ),
  siteUrl:
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    "http://localhost:3000",
};

/** 서버 전용. 클라이언트 컴포넌트에서 import 하지 마세요. */
export function serviceRoleKey(): string {
  return required(
    "SUPABASE_SERVICE_ROLE_KEY",
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}
