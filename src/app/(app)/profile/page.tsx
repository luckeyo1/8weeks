import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/features/auth/service";
import { isAdmin } from "@/features/admin/guard";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { SignOutButton } from "@/features/auth/SignOutButton";

export const metadata: Metadata = {
  title: "내 정보",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const profile = await requireProfile();
  const admin = await isAdmin();

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
    </div>
  );
}
