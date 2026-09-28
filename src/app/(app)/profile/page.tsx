import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/features/auth/service";
import { isAdmin } from "@/features/admin/guard";
import { Avatar } from "@/components/ui/Avatar";
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

      {admin && (
        <Link
          href="/admin"
          className="card flex items-center justify-between p-4 text-sm font-medium text-ink hover:border-primary/40"
        >
          <span>관리자 대시보드</span>
          <span aria-hidden className="text-ink-soft">→</span>
        </Link>
      )}

      <div className="mt-2">
        <SignOutButton />
      </div>
    </div>
  );
}
