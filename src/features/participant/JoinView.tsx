"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatKoreanRange } from "@/lib/date";
import { track } from "@/lib/analytics";
import { joinPrayer } from "./actions";
import type { JoinPreview } from "@/types/domain";

export function JoinView({
  preview,
  isAuthed,
}: {
  preview: JoinPreview;
  isAuthed: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const loginHref = `/login?returnUrl=${encodeURIComponent(`/join/${preview.shareToken}`)}`;
  const remainPhrase =
    preview.daysLeft > 0
      ? `앞으로 ${preview.daysLeft}일 동안`
      : "오늘";

  function handleJoin() {
    startTransition(async () => {
      const res = await joinPrayer(preview.shareToken);
      if (res.ok) {
        track("prayer_joined", { prayerId: res.data.prayerId });
        toast.show("함께 기도하기 시작했어요.");
        router.replace(`/prayers/${res.data.prayerId}`);
        router.refresh();
      } else if (res.code === "UNAUTHENTICATED") {
        router.push(loginHref);
      } else if (res.code === "ALREADY_JOINED" && preview.prayerId) {
        router.replace(`/prayers/${preview.prayerId}`);
      } else {
        toast.show(res.message, "error");
      }
    });
  }

  return (
    <div className="flex flex-1 flex-col px-6 py-10">
      {/* 미리보기 (명세 13) */}
      <div className="flex flex-col items-center gap-3 text-center">
        <Avatar
          name={preview.owner.nickname}
          src={preview.owner.profileImageUrl}
          size={64}
        />
        <p className="text-[15px] text-ink-soft">
          <span className="font-semibold text-ink">
            {preview.owner.nickname}
          </span>
          님이 기도를 부탁했어요.
        </p>
      </div>

      <div className="card mt-8 flex flex-col gap-3 p-5">
        <h1 className="text-lg font-bold leading-snug text-ink">
          {preview.title}
        </h1>
        {preview.description && (
          <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink-soft">
            {preview.description}
          </p>
        )}
        <p className="border-t border-line pt-3 text-sm text-ink-soft">
          {formatKoreanRange(preview.startDate, preview.endDate)}
        </p>
      </div>

      <div className="mt-auto flex flex-col gap-2 pt-10">
        {renderCta()}
      </div>
    </div>
  );

  function renderCta() {
    // 본인 기도 (명세 15)
    if (preview.viewerRelation === "OWNER") {
      return (
        <>
          <p className="pb-1 text-center text-sm text-ink-soft">
            내가 만든 기도제목이에요.
          </p>
          <Link href={preview.prayerId ? `/prayers/${preview.prayerId}` : "/home"}>
            <Button size="lg" fullWidth>
              기도제목 관리하기
            </Button>
          </Link>
        </>
      );
    }

    // 이미 참여 중 (명세 16)
    if (preview.viewerRelation === "PARTICIPANT") {
      return (
        <>
          <p className="pb-1 text-center text-sm text-ink-soft">
            이미 함께 기도하고 있어요.
          </p>
          <Link href="/home">
            <Button size="lg" fullWidth>
              오늘의 기도로 이동
            </Button>
          </Link>
        </>
      );
    }

    // 기간 종료 → 참여 불가
    if (preview.status !== "ACTIVE") {
      return (
        <>
          <p className="pb-1 text-center text-sm text-ink-soft">
            함께 기도하는 기간이 종료되었어요.
          </p>
          <Link href={isAuthed ? "/home" : "/"}>
            <Button variant="secondary" size="lg" fullWidth>
              {isAuthed ? "홈으로" : "처음으로"}
            </Button>
          </Link>
        </>
      );
    }

    // 비로그인 → 로그인 유도 (명세 14)
    if (!isAuthed) {
      return (
        <Link href={loginHref}>
          <Button size="lg" fullWidth>
            함께 기도하기
          </Button>
        </Link>
      );
    }

    // 로그인 + 미참여 → 확인 후 참여 (명세 17)
    return (
      <>
        <p className="pb-1 text-center text-sm text-ink-soft">
          이 기도제목을 {remainPhrase} 함께 기도할까요?
        </p>
        <Button size="lg" fullWidth loading={pending} onClick={handleJoin}>
          함께 기도하기
        </Button>
        <Link href="/home">
          <Button variant="ghost" size="lg" fullWidth>
            다음에
          </Button>
        </Link>
      </>
    );
  }
}
