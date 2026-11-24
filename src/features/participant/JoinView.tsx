"use client";

import { useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { formatKoreanRange } from "@/lib/date";
import { track } from "@/lib/analytics";
import { joinPrayer } from "./actions";
import { KakaoLoginButton } from "@/features/auth/KakaoLoginButton";
import type { JoinPreview } from "@/types/domain";

/**
 * 초대 링크 첫 화면. 초대받은 사람 대부분은 처음 오는 사람이라
 * - 누가 부탁했는지(관계) → 무엇을 하게 되는지(부담의 크기) → 안심(비공개)을 차례로 보여주고
 * - 비로그인이면 가입으로 바로 보낸다(로그인은 보조). 가입/로그인 후에는 이 화면으로 돌아온다.
 */
export function JoinView({
  preview,
  isAuthed,
  kakaoEnabled = false,
}: {
  preview: JoinPreview;
  isAuthed: boolean;
  /** 카카오 로그인이 설정돼 있으면 초대받은 사람에게 가장 빠른 길로 먼저 보여준다 */
  kakaoEnabled?: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const returnTo = encodeURIComponent(`/join/${preview.shareToken}`);
  const loginHref = `/login?returnUrl=${returnTo}`;
  const signupHref = `/signup?returnUrl=${returnTo}`;
  const owner = preview.owner.nickname;
  const remainPhrase =
    preview.daysLeft > 0 ? `앞으로 ${preview.daysLeft}일 동안` : "오늘 하루";
  const canJoin =
    preview.status === "ACTIVE" &&
    (preview.viewerRelation === "GUEST" || preview.viewerRelation === "NONE");

  function handleJoin() {
    startTransition(async () => {
      const res = await joinPrayer(preview.shareToken);
      if (res.ok) {
        track("prayer_joined", { prayerId: res.data.prayerId });
        toast.show("함께 기도하기 시작했어요.");
        router.replace(`/prayers/${res.data.prayerId}`);
        router.refresh();
      } else if (res.code === "UNAUTHENTICATED") {
        router.push(signupHref);
      } else if (res.code === "ALREADY_JOINED" && preview.prayerId) {
        router.replace(`/prayers/${preview.prayerId}`);
      } else {
        toast.show(res.message, "error");
      }
    });
  }

  return (
    <div className="flex flex-1 flex-col px-6 pb-8 pt-6">
      {/* 브랜드: 처음 온 사람에게 어디에 왔는지 알려준다 */}
      <Link
        href="/"
        className="flex w-fit items-center gap-2 text-sm font-semibold text-ink"
      >
        <Image
          src="/icons/icon-192.png"
          alt=""
          width={24}
          height={24}
          className="h-6 w-6 rounded-md"
        />
        기도 동행
      </Link>

      {/* 누가 부탁했는지 */}
      <div className="mt-8 flex flex-col items-center gap-3 text-center">
        <Avatar name={owner} src={preview.owner.profileImageUrl} size={64} />
        <h1 className="text-[22px] font-bold leading-snug text-ink">
          {owner}님이
          <br />
          함께 기도해 달라고 부탁했어요
        </h1>
      </div>

      {/* 기도제목 (수락 전에는 비공개) */}
      <div className="card mt-6 flex flex-col gap-3 p-5">
        {preview.canViewContent && preview.title ? (
          <>
            <h2 className="text-lg font-bold leading-snug text-ink">
              {preview.title}
            </h2>
            {preview.description && (
              <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-ink-soft">
                {preview.description}
              </p>
            )}
            <p className="border-t border-line pt-3 text-sm text-ink-soft">
              {formatKoreanRange(preview.startDate, preview.endDate)}
            </p>
          </>
        ) : (
          // 개인정보 보호(P0): 수락 전에는 기도 내용을 보여주지 않는다
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-lg"
            >
              🔒
            </span>
            <div>
              <h2 className="text-[15px] font-semibold text-ink">
                기도제목은 수락한 뒤에 보여요
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-ink-soft">
                {owner}님이 초대한 사람만 볼 수 있는 비공개 기도예요. 검색에도
                노출되지 않아요.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 함께하면 무엇을 하게 되는지: 부담을 미리 알 수 있게 */}
      {canJoin && (
        <ul className="mt-5 flex flex-col gap-3 px-1">
          <Expectation icon="🗓" text={`${remainPhrase} 함께 기도해요`} />
          <Expectation
            icon="🙏"
            text="하루 한 번, 기도한 뒤 가볍게 체크하면 돼요"
          />
          <Expectation
            icon="🤍"
            text="누가 몇 번 기도했는지는 따로 보여주지 않아요"
          />
          <Expectation
            icon="💌"
            text={`기간이 끝나면 ${owner}님의 응답과 변화를 함께 들을 수 있어요`}
          />
        </ul>
      )}

      <div className="mt-auto flex flex-col gap-2 pt-8">{renderCta()}</div>
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
          <Link
            href={preview.prayerId ? `/prayers/${preview.prayerId}` : "/home"}
          >
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
              {isAuthed ? "홈으로" : "기도 동행 알아보기"}
            </Button>
          </Link>
        </>
      );
    }

    // 비로그인 + 카카오: 한 번에 가입/로그인하고 이 화면으로 돌아와 수락한다
    if (!isAuthed && kakaoEnabled) {
      return (
        <>
          <p className="pb-1 text-center text-sm text-ink-soft">
            카카오로 바로 시작하고 함께 기도해요
          </p>
          <KakaoLoginButton returnUrl={`/join/${preview.shareToken}`} />
          <Link
            href={signupHref}
            className="py-2 text-center text-sm text-ink-soft hover:text-ink"
          >
            다른 방법으로 계속하기
          </Link>
        </>
      );
    }

    // 비로그인 → 가입으로 바로 (초대받은 사람 대부분은 처음 온 사람). 로그인은 보조.
    if (!isAuthed) {
      return (
        <>
          <Link href={signupHref}>
            <Button size="lg" fullWidth>
              함께 기도하기
            </Button>
          </Link>
          <Link
            href={loginHref}
            className="py-2 text-center text-sm text-ink-soft hover:text-ink"
          >
            이미 계정이 있어요 · 로그인
          </Link>
        </>
      );
    }

    // 로그인 + 미참여 → 확인 후 참여 (명세 17)
    return (
      <>
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

function Expectation({ icon, text }: { icon: string; text: string }) {
  return (
    <li className="flex items-start gap-3 text-[15px] leading-relaxed text-ink">
      <span aria-hidden className="w-6 shrink-0 text-center">
        {icon}
      </span>
      <span className="break-keep">{text}</span>
    </li>
  );
}
