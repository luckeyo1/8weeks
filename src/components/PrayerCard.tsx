"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { DDayBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { formatDDay, appTodayISO } from "@/lib/date";
import { track } from "@/lib/analytics";
import { checkPrayer } from "@/features/check/actions";
import type { ParticipatingPrayer } from "@/types/domain";

/** 홈 "오늘의 기도" 카드 (명세 7/52/53). own=true 면 내가 만든 기도. */
export function PrayerCard({
  prayer,
  own = false,
}: {
  prayer: ParticipatingPrayer;
  own?: boolean;
}) {
  const toast = useToast();
  const [checked, setChecked] = useState(prayer.checkedToday);
  const [pending, startTransition] = useTransition();

  const dday = formatDDay(prayer.endDate, appTodayISO());

  function handleCheck() {
    if (checked || pending) return; // double click 방지 (명세 68)
    startTransition(async () => {
      const res = await checkPrayer(prayer.prayerId);
      if (res.ok) {
        setChecked(true);
        track("prayer_checked", { prayerId: prayer.prayerId });
        toast.show("오늘도 함께 기도해주셔서 감사해요.");
      } else {
        toast.show(res.message, "error");
      }
    });
  }

  return (
    <article
      className={cn(
        "card flex flex-col gap-3 p-4 transition-opacity",
        checked && "opacity-70", // 완료 카드 opacity 약간 감소 (명세 52)
      )}
    >
      <div className="flex items-center gap-3">
        {own ? (
          <span className="inline-flex items-center rounded-pill bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">
            내 기도제목
          </span>
        ) : (
          <>
            <Avatar
              name={prayer.owner.nickname}
              src={prayer.owner.profileImageUrl}
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-ink">
                {prayer.owner.nickname}
              </p>
            </div>
          </>
        )}
        {own && <div className="flex-1" />}
        <DDayBadge label={dday} />
      </div>

      <div className="flex flex-col gap-1">
        <p className="font-medium leading-snug text-ink">{prayer.title}</p>
        {prayer.description && (
          <p className="line-clamp-3 text-sm leading-relaxed text-ink-soft">
            {prayer.description}
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={handleCheck}
        disabled={checked || pending}
        aria-pressed={checked}
        className={cn(
          "mt-1 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-card font-semibold transition-colors",
          checked
            ? "cursor-default bg-primary-soft text-primary"
            : "bg-primary text-white hover:bg-primary-hover",
        )}
      >
        {checked ? (
          <>
            <span className="animate-check-pop" aria-hidden>
              ✓
            </span>
            오늘 함께 기도했습니다.
          </>
        ) : pending ? (
          <span
            aria-hidden
            className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"
          />
        ) : (
          <>🙏 오늘 함께 기도했어요</>
        )}
      </button>

      <Link
        href={`/prayers/${prayer.prayerId}`}
        className="text-center text-xs text-ink-soft/70 hover:text-ink-soft"
      >
        자세히 보기
      </Link>
    </article>
  );
}
