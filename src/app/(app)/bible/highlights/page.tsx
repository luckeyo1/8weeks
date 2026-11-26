import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/features/auth/service";
import { getRecentHighlights } from "@/services/bible";
import { groupHighlights } from "@/lib/bible/highlights";
import { HighlightList } from "@/features/bible/HighlightList";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "내 하이라이트",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** 내 하이라이트 모아보기 — 최근에 표시한 순. 본인에게만 보인다. */
export default async function HighlightsPage() {
  const profile = await requireProfile();
  const rows = await getRecentHighlights(profile.id, 300);

  return (
    <div className="flex flex-col gap-4">
      <PageHeader title="내 하이라이트" backHref="/bible" />
      {rows === null ? (
        <EmptyState
          title="하이라이트를 준비하고 있어요."
          description="잠시 후 다시 확인해 주세요."
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="아직 표시한 구절이 없어요."
          description="성경을 읽다가 마음에 남는 절을 눌러 색으로 표시해 보세요."
          action={
            <Link href="/bible">
              <Button variant="secondary">성경 읽으러 가기</Button>
            </Link>
          }
        />
      ) : (
        <>
          <p className="text-[13px] text-ink-soft">
            최근에 표시한 순서예요. 누르면 그 절로 이동해요. 나에게만 보여요.
          </p>
          <HighlightList groups={groupHighlights(rows)} />
        </>
      )}
    </div>
  );
}
