import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/features/auth/service";
import {
  getOwnActiveChecklist,
  getStarterProgress,
  getTodaysPrayers,
} from "@/services/prayers";
import { StarterChecklist } from "@/features/onboarding/StarterChecklist";
import { getBibleReadingState } from "@/services/bible";
import { DailyVerseCard } from "@/features/bible/DailyVerseCard";
import { PrayerCard } from "@/components/PrayerCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { appTodayISO, formatKoreanDateWithWeekday } from "@/lib/date";
import {
  VERSE_TRANSLATION,
  formatVerseRef,
  pickDailyVerse,
} from "@/lib/bible/daily";
import type { ParticipatingPrayer } from "@/types/domain";

export const metadata: Metadata = {
  title: "홈",
  robots: { index: false, follow: false },
};

// 항상 최신 데이터 (기도 체크/참여 반영)
export const dynamic = "force-dynamic";

// 완료 카드는 아래로 (명세 52)
function byUnchecked(a: ParticipatingPrayer, b: ParticipatingPrayer) {
  return Number(a.checkedToday) - Number(b.checkedToday);
}

export default async function HomePage() {
  const profile = await requireProfile();
  const today = appTodayISO();
  const [shared, own, reading, starter] = await Promise.all([
    getTodaysPrayers(profile.id), // 공유받아 함께 기도하는 것
    getOwnActiveChecklist(profile.id), // 내가 만든 진행 중 기도
    getBibleReadingState(profile.id, today), // 성경 읽은 곳 기록 (본인만)
    getStarterProgress(profile.id), // 시작하기 체크리스트
  ]);
  const verse = pickDailyVerse(today);

  const sharedSorted = [...shared].sort(byUnchecked);
  const ownSorted = [...own].sort(byUnchecked);
  const nothing = sharedSorted.length === 0 && ownSorted.length === 0;
  // 아직 "기도 동행"의 핵심(내 기도에 누군가 함께함)을 경험하지 못했고, 다른 사람 기도에도
  // 함께하지 않는 사용자에게만 시작하기 체크리스트를 보여준다(다 하면 저절로 사라짐).
  const showStarter =
    sharedSorted.length === 0 && !(starter.hasPrayer && starter.hasCompanion);

  const remaining =
    sharedSorted.filter((p) => !p.checkedToday).length +
    ownSorted.filter((p) => !p.checkedToday).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-ink-soft">
          {formatKoreanDateWithWeekday(today)}
        </p>
        <h1 className="mt-1 text-xl font-bold text-ink">
          안녕하세요, {profile.nickname}님.
        </h1>
        {!nothing && (
          <p className="mt-1 text-sm text-ink-soft">
            {remaining > 0
              ? `오늘 기도할 제목이 ${remaining}개 남았어요.`
              : "오늘 기도를 모두 마쳤어요. 감사해요."}
          </p>
        )}
      </div>

      {showStarter && <StarterChecklist progress={starter} />}

      <DailyVerseCard
        // 저장 후 서버 데이터가 바뀌면 다시 마운트해 로컬 상태를 서버 값으로 맞춘다
        key={`${reading.todayKeys.join(",")}|${reading.readKeys.length}|${reading.available}`}
        verse={{
          text: verse.text,
          reference: formatVerseRef(verse),
          translation: VERSE_TRANSLATION,
        }}
        reading={reading}
      />

      {nothing ? (
        showStarter ? null : (
          <EmptyState
            image="/illust/empty.png"
            title="아직 함께 기도할 제목이 없어요."
            description="기도제목을 만들거나, 누군가의 초대를 받아보세요."
            action={
              <Link href="/prayers/new">
                <Button>기도제목 만들기</Button>
              </Link>
            }
          />
        )
      ) : (
        <>
          {/* 공유받아 함께 기도하는 사람 */}
          {sharedSorted.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-[15px] font-semibold text-ink">
                오늘 함께 기도할 사람
              </h2>
              <div className="flex flex-col gap-3">
                {sharedSorted.map((p) => (
                  <PrayerCard key={p.prayerId} prayer={p} />
                ))}
              </div>
            </section>
          )}

          {/* 내가 만든 기도 (작성자 본인 체크) */}
          {ownSorted.length > 0 && (
            <section className="flex flex-col gap-3">
              <h2 className="text-[15px] font-semibold text-ink">나의 기도</h2>
              <div className="flex flex-col gap-3">
                {ownSorted.map((p) => (
                  <PrayerCard key={p.prayerId} prayer={p} own />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
