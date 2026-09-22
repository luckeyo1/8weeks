"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/cn";
import { formatDDay, formatKoreanRange, appTodayISO } from "@/lib/date";
import { checkPrayer } from "@/features/check/actions";
import { leavePrayer } from "./actions";
import type { ParticipantPrayerDetail } from "@/types/domain";

export function ParticipantPrayerView({
  detail,
}: {
  detail: ParticipantPrayerDetail;
}) {
  const router = useRouter();
  const toast = useToast();
  const [checked, setChecked] = useState(detail.checkedToday);
  const [pending, startTransition] = useTransition();
  const [leaveOpen, setLeaveOpen] = useState(false);

  const today = appTodayISO();
  const dday = formatDDay(detail.endDate, today);
  const isActive = detail.status === "ACTIVE";

  function handleCheck() {
    if (checked || pending) return;
    startTransition(async () => {
      const res = await checkPrayer(detail.prayerId);
      if (res.ok) {
        setChecked(true);
        toast.show("오늘도 함께 기도해주셔서 감사해요.");
        router.refresh();
      } else {
        toast.show(res.message, "error");
      }
    });
  }

  function handleLeave() {
    startTransition(async () => {
      const res = await leavePrayer(detail.prayerId);
      if (res.ok) {
        toast.show("기도 목록에서 제거했어요.");
        router.replace("/home");
        router.refresh();
      } else {
        toast.show(res.message, "error");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <section className="card flex flex-col gap-3 p-5">
        <div className="flex items-center gap-3">
          <Avatar name={detail.owner.nickname} src={detail.owner.profileImageUrl} />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">{detail.owner.nickname}</p>
            <p className="text-xs text-ink-soft">
              {formatKoreanRange(detail.startDate, detail.endDate)}
            </p>
          </div>
          {isActive ? (
            <span className="text-sm text-ink-soft">{dday}</span>
          ) : (
            <StatusBadge status={detail.status} />
          )}
        </div>

        <h1 className="text-lg font-bold leading-snug text-ink">
          {detail.title}
        </h1>
        {detail.description && (
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink-soft">
            {detail.description}
          </p>
        )}
      </section>

      {isActive ? (
        <>
          {/* 기도 체크 */}
          <button
            type="button"
            onClick={handleCheck}
            disabled={checked || pending}
            aria-pressed={checked}
            className={cn(
              "flex min-h-[52px] w-full items-center justify-center gap-2 rounded-card text-base font-semibold transition-colors",
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
            ) : (
              <>🙏 오늘 함께 기도했어요</>
            )}
          </button>

          {/* streak (명세 20) — 죄책감 없는 담담한 표현 */}
          <p className="text-center text-sm text-ink-soft">
            지난 {detail.recentWindow}일 중 {detail.recentDays}일 함께
            기도했어요.
          </p>
        </>
      ) : (
        <ResultCard detail={detail} />
      )}

      {/* 더보기: 함께 기도 그만하기 (명세 34) */}
      <div className="pt-2">
        <Button variant="ghost" fullWidth onClick={() => setLeaveOpen(true)}>
          함께 기도 그만하기
        </Button>
      </div>

      <Modal
        open={leaveOpen}
        onClose={() => setLeaveOpen(false)}
        title="이 기도제목을 내 기도 목록에서 제거할까요?"
      >
        <div className="flex flex-col gap-4 px-5 pb-6 pt-5">
          <div className="mx-auto h-1 w-10 rounded-full bg-line" aria-hidden />
          <h2 className="text-base font-semibold text-ink">
            이 기도제목을 내 기도 목록에서 제거할까요?
          </h2>
          <div className="flex flex-col gap-2">
            <Button
              variant="danger"
              size="lg"
              fullWidth
              loading={pending}
              onClick={handleLeave}
            >
              제거하기
            </Button>
            <Button
              variant="ghost"
              size="lg"
              fullWidth
              onClick={() => setLeaveOpen(false)}
            >
              다음에
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/** 종료된 기도 결과 표시 (명세 28) */
function ResultCard({ detail }: { detail: ParticipantPrayerDetail }) {
  const { status, owner, latestUpdate } = detail;

  let headline: string;
  if (status === "ANSWERED") {
    headline = "응답을 경험했어요 🙌";
  } else if (status === "CLOSED" && latestUpdate?.type === "CHANGED") {
    headline = `${owner.nickname}님의 기도제목에 변화가 있었어요.`;
  } else if (status === "CLOSED") {
    headline = "함께 기도했던 기도제목이 마무리되었습니다.";
  } else {
    // EXPIRED (작성자가 아직 정리 전)
    headline = "함께 기도하는 기간이 종료되었어요.";
  }

  return (
    <section className="card flex flex-col gap-3 p-5">
      <p className="text-[15px] font-semibold text-ink">{headline}</p>
      {latestUpdate?.content && (
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink-soft">
          {latestUpdate.content}
        </p>
      )}
    </section>
  );
}
