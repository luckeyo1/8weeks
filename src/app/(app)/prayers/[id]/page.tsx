import type { Metadata } from "next";
import Link from "next/link";
import { requireProfile } from "@/features/auth/service";
import {
  getOwnerPrayerDetail,
  getParticipantPrayerDetail,
  getViewerRelation,
} from "@/services/prayers";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { OwnerPrayerView } from "@/features/prayer/OwnerPrayerView";
import { ParticipantPrayerView } from "@/features/participant/ParticipantPrayerView";
import { AppError } from "@/lib/errors";
import type {
  OwnerPrayerDetail,
  ParticipantPrayerDetail,
} from "@/types/domain";

// 상세는 검색 색인 금지 (명세 84)
export const metadata: Metadata = {
  title: "기도제목",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PrayerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireProfile();

  let relation: "OWNER" | "PARTICIPANT" | "NONE";
  try {
    relation = await getViewerRelation(id, profile.id);
  } catch {
    relation = "NONE";
  }

  if (relation === "NONE") {
    return (
      <div>
        <PageHeader backHref="/home" />
        <EmptyState
          title="이 기도제목에 접근할 수 없어요."
          description="초대받은 사람만 볼 수 있어요."
          action={
            <Link href="/home">
              <Button variant="secondary">홈으로</Button>
            </Link>
          }
        />
      </div>
    );
  }

  // 데이터 조회만 try 안에서 하고, 화면은 밖에서 그린다 (react-hooks/error-boundaries)
  let ownerDetail: OwnerPrayerDetail | null = null;
  let participantDetail: ParticipantPrayerDetail | null = null;
  let message = "기도제목을 불러오지 못했어요.";
  try {
    if (relation === "OWNER") {
      ownerDetail = await getOwnerPrayerDetail(id, profile.id);
    } else {
      participantDetail = await getParticipantPrayerDetail(id, profile.id);
    }
  } catch (e) {
    if (e instanceof AppError) message = e.message;
  }

  if (ownerDetail) {
    return (
      <div>
        <PageHeader title="내 기도제목" backHref="/my-prayers" />
        <div className="pt-2">
          <OwnerPrayerView detail={ownerDetail} />
        </div>
      </div>
    );
  }

  if (participantDetail) {
    return (
      <div>
        <PageHeader title="함께 기도 중" backHref="/home" />
        <div className="pt-2">
          <ParticipantPrayerView detail={participantDetail} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader backHref="/home" />
      <EmptyState
        title={message}
        action={
          <Link href="/home">
            <Button variant="secondary">홈으로</Button>
          </Link>
        }
      />
    </div>
  );
}
