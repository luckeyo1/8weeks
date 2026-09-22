import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/features/auth/service";
import { getTodaysPrayers } from "@/services/prayers";
import { PrayerCard } from "@/components/PrayerCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { appTodayISO, formatKoreanDateWithWeekday } from "@/lib/date";

export const metadata: Metadata = {
  title: "홈",
  robots: { index: false, follow: false },
};

// 항상 최신 데이터 (기도 체크/참여 반영)
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const profile = await requireProfile();
  const prayers = await getTodaysPrayers(profile.id);

  // 완료 카드는 아래로 (명세 52)
  const sorted = [...prayers].sort(
    (a, b) => Number(a.checkedToday) - Number(b.checkedToday),
  );

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="text-sm text-ink-soft">
          {formatKoreanDateWithWeekday(appTodayISO())}
        </p>
        <h1 className="mt-1 text-xl font-bold text-ink">
          안녕하세요, {profile.nickname}님.
        </h1>
      </div>

      <section aria-labelledby="today-heading" className="flex flex-col gap-3">
        <h2 id="today-heading" className="text-[15px] font-semibold text-ink">
          오늘 함께 기도할 사람
        </h2>

        {sorted.length === 0 ? (
          <EmptyState
            title="아직 함께 기도할 사람이 없어요."
            description="누군가와 기도제목을 나눠보세요."
            action={
              <Link href="/prayers/new">
                <Button>기도제목 만들기</Button>
              </Link>
            }
          />
        ) : (
          <div className="flex flex-col gap-3">
            {sorted.map((p) => (
              <PrayerCard key={p.prayerId} prayer={p} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
