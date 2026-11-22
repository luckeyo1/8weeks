import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/features/auth/service";
import { isAdmin } from "@/features/admin/guard";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { SignOutButton } from "@/features/auth/SignOutButton";
import { DeleteAccountButton } from "@/features/auth/DeleteAccountButton";
import { PushToggle } from "@/features/push/PushToggle";
import { getLoginMethods, isKakaoEnabled } from "@/features/auth/kakao";
import { KakaoSymbol, kakaoStartHref } from "@/features/auth/KakaoLoginButton";

const KAKAO_MESSAGES: Record<string, { text: string; error?: boolean }> = {
  linked: { text: "카카오 계정을 연결했어요. 다음부터 카카오로 로그인할 수 있어요." },
  taken: {
    text: "이 카카오 계정은 이미 다른 기도 동행 계정에 연결돼 있어요.",
    error: true,
  },
  error: {
    text: "카카오 연결을 마치지 못했어요. 잠시 후 다시 시도해 주세요.",
    error: true,
  },
};

export const metadata: Metadata = {
  title: "내 정보",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireProfile();
  const [admin, kakao, methods, sp] = await Promise.all([
    isAdmin(),
    isKakaoEnabled(),
    getLoginMethods(profile.id),
    searchParams,
  ]);
  const kakaoMsg =
    typeof sp.kakao === "string" ? KAKAO_MESSAGES[sp.kakao] : undefined;

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-bold text-ink">내 정보</h1>

      <div className="card flex items-center gap-4 p-5">
        <Avatar name={profile.nickname} src={profile.profileImageUrl} size={56} />
        <div>
          <p className="text-lg font-semibold text-ink">{profile.nickname}</p>
          <p className="text-sm text-ink-soft">함께 기도해요</p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-ink-soft">알림</p>
        <PushToggle />
      </div>

      {kakao && methods.kakaoLinked !== null && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-ink-soft">로그인</p>
          {kakaoMsg && (
            <p
              role="status"
              className={
                kakaoMsg.error
                  ? "rounded-card bg-red-50 px-4 py-3 text-sm text-red-600"
                  : "rounded-card bg-primary-soft px-4 py-3 text-sm text-primary"
              }
            >
              {kakaoMsg.text}
            </p>
          )}
          {methods.kakaoLinked ? (
            <div className="card flex items-center gap-3 p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FEE500]">
                <KakaoSymbol className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">카카오 계정 연결됨</p>
                <p className="text-[13px] text-ink-soft">
                  카카오로 바로 로그인할 수 있어요.
                </p>
              </div>
              <span aria-hidden className="text-primary">
                ✓
              </span>
            </div>
          ) : (
            // OAuth 시작 라우트라 Link(프리페치) 대신 a
            <a
              href={kakaoStartHref("/profile", "link")}
              className="card flex items-center gap-3 p-4 hover:border-primary/40"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#FEE500]">
                <KakaoSymbol className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">카카오 계정 연결하기</p>
                <p className="text-[13px] text-ink-soft">
                  연결하면 다음부터 아이디 없이 카카오로 로그인할 수 있어요.
                </p>
              </div>
              <span aria-hidden className="text-ink-soft">
                →
              </span>
            </a>
          )}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <p className="text-xs font-medium text-ink-soft">메뉴</p>
        <Link
          href="/"
          className="card flex items-center justify-between p-4 text-sm font-medium text-ink hover:border-primary/40"
        >
          <span>서비스 소개</span>
          <span aria-hidden className="text-ink-soft">→</span>
        </Link>
        <Link
          href="/prayers/new"
          className="card flex items-center justify-between p-4 text-sm font-medium text-ink hover:border-primary/40"
        >
          <span>기도제목 만들기</span>
          <span aria-hidden className="text-ink-soft">→</span>
        </Link>
        <Link
          href="/bible"
          className="card flex items-center justify-between p-4 text-sm font-medium text-ink hover:border-primary/40"
        >
          <span>성경 통독 현황</span>
          <span aria-hidden className="text-ink-soft">→</span>
        </Link>
      </div>

      {admin && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-medium text-ink-soft">관리자 메뉴</p>
          <Link href="/admin">
            <Button variant="secondary" size="lg" fullWidth>
              <span className="flex w-full items-center justify-between">
                <span className="inline-flex items-center gap-2">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinejoin="round"
                    />
                  </svg>
                  관리자 대시보드
                </span>
                <span aria-hidden>→</span>
              </span>
            </Button>
          </Link>
        </div>
      )}

      <div className="mt-2">
        <SignOutButton />
      </div>

      {/* 약관 / 개인정보 / 탈퇴 */}
      <div className="mt-4 flex flex-col items-center gap-3 border-t border-line pt-6">
        <nav className="flex items-center gap-3 text-[13px] text-ink-soft">
          <Link href="/privacy" className="hover:text-ink">
            개인정보 처리방침
          </Link>
          <span aria-hidden className="text-line">·</span>
          <Link href="/terms" className="hover:text-ink">
            이용약관
          </Link>
        </nav>
        <DeleteAccountButton />
      </div>
    </div>
  );
}
