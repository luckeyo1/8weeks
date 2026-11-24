"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Avatar } from "@/components/ui/Avatar";
import { DDayBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { formatDDay, appTodayISO } from "@/lib/date";
import { track } from "@/lib/analytics";
import { checkPrayer, uncheckPrayer } from "@/features/check/actions";
import type { ParticipatingPrayer } from "@/types/domain";

/**
 * 내 기도에 함께 기도하는 사람 — "나를 위해 기도하는 사람이 있다"는 걸 보여준다.
 * 누가 몇 번 기도했는지는 보여주지 않는다(관계의 숫자화 금지). 아직 없으면 조용히 초대를 권한다.
 */
function Companions({
  names,
  prayerHref,
}: {
  names: string[];
  prayerHref: string;
}) {
  if (names.length === 0) {
    return (
      <Link
        href={prayerHref}
        className="-my-1 flex min-h-[36px] items-center text-[13px] text-ink-soft hover:text-ink"
      >
        아직 함께하는 사람이 없어요 ·{" "}
        <span className="ml-1 font-medium text-primary">초대하기 ›</span>
      </Link>
    );
  }
  const [first, second] = names;
  const text =
    names.length === 1
      ? `${first}님이 함께 기도하고 있어요`
      : names.length === 2
        ? `${first}님, ${second}님이 함께 기도하고 있어요`
        : `${first}님 외 ${names.length - 1}명이 함께 기도하고 있어요`;
  return (
    <div className="flex items-center gap-2">
      <span aria-hidden className="flex -space-x-1.5">
        {names.slice(0, 3).map((n, i) => (
          <span
            key={`${n}-${i}`}
            className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-primary-soft text-[11px] font-semibold text-primary"
          >
            {n.trim().charAt(0) || "?"}
          </span>
        ))}
      </span>
      <p className="text-[13px] text-ink-soft">{text}</p>
    </div>
  );
}

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

  function handleUncheck() {
    if (pending) return;
    startTransition(async () => {
      const res = await uncheckPrayer(prayer.prayerId);
      if (res.ok) {
        setChecked(false);
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

      <Link
        href={`/prayers/${prayer.prayerId}`}
        className="flex flex-col gap-1 rounded-lg -mx-1 px-1 py-0.5 hover:bg-line/30"
        aria-label={`${prayer.title} 자세히 보기`}
      >
        <p className="font-medium leading-snug text-ink">{prayer.title}</p>
        {prayer.description && (
          <p className="line-clamp-3 text-sm leading-relaxed text-ink-soft">
            {prayer.description}
          </p>
        )}
      </Link>

      {own && prayer.companions && (
        <Companions
          names={prayer.companions}
          prayerHref={`/prayers/${prayer.prayerId}`}
        />
      )}

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

      {/* 실수로 눌렀을 때 되돌리기 (조용하게) */}
      {checked && (
        <button
          type="button"
          onClick={handleUncheck}
          disabled={pending}
          className="-mt-1 self-center px-2 py-1 text-[13px] text-ink-soft underline-offset-2 transition-colors hover:text-ink hover:underline"
        >
          되돌리기
        </button>
      )}
    </article>
  );
}
