import type { Metadata } from "next";
import { requireProfile } from "@/features/auth/service";
import { getOwnedPrayers, getParticipatingPrayers } from "@/services/prayers";
import { MyPrayersTabs } from "@/features/prayer/MyPrayersTabs";

export const metadata: Metadata = {
  title: "나의 기도",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MyPrayersPage() {
  const profile = await requireProfile();
  const [owned, participating] = await Promise.all([
    getOwnedPrayers(profile.id),
    getParticipatingPrayers(profile.id),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-bold text-ink">나의 기도</h1>
      <MyPrayersTabs owned={owned} participating={participating} />
    </div>
  );
}
