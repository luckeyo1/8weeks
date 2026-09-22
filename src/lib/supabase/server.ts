import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { publicEnv, serviceRoleKey } from "@/lib/env";
import type { Database } from "@/types/db";

/**
 * 서버(RSC / Server Action / Route Handler)용 클라이언트.
 * 쿠키 기반 세션을 사용하며 RLS 가 적용됩니다. 현재 로그인 사용자 컨텍스트.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // RSC 렌더링 중 set 호출은 무시 (middleware 가 세션 갱신 담당)
          }
        },
      },
    },
  );
}

/**
 * service_role 클라이언트. RLS 를 우회합니다.
 * 반드시 서버에서 애플리케이션 권한 검증을 마친 뒤에만 사용합니다.
 * 절대 클라이언트로 노출 금지. (명세 97)
 */
export function createAdminClient() {
  return createServerClient<Database>(
    publicEnv.supabaseUrl,
    serviceRoleKey(),
    {
      cookies: {
        getAll() {
          return [];
        },
        setAll() {
          /* no-op: admin 클라이언트는 세션 쿠키를 쓰지 않음 */
        },
      },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}
