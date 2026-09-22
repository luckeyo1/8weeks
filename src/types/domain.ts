/**
 * 앱(UI/서비스)에서 사용하는 도메인 타입.
 * DB row 를 그대로 노출하지 않고, 화면에 필요한 형태로만 전달합니다.
 * (민감정보 email/owner 내부 id 등은 포함하지 않습니다 — 명세 32)
 */
import type {
  ParticipantStatus,
  PrayerStatus,
  PrayerUpdateType,
} from "@/types/db";

export interface PublicProfile {
  nickname: string;
  profileImageUrl: string | null;
}

export interface MyProfile extends PublicProfile {
  id: string;
}

/** 홈 "오늘의 기도" 카드 & 함께 기도 중 목록용 */
export interface ParticipatingPrayer {
  prayerId: string;
  owner: PublicProfile;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  status: PrayerStatus;
  daysLeft: number;
  checkedToday: boolean;
  participantId: string;
  participantStatus: ParticipantStatus;
}

/** 내가 작성한 기도제목 목록용 */
export interface OwnedPrayerSummary {
  prayerId: string;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  status: PrayerStatus;
  daysLeft: number;
  participantCount: number;
  extensionCount: number;
}

/** 작성자용 상세 */
export interface OwnerPrayerDetail extends OwnedPrayerSummary {
  shareToken: string;
  shareUrl: string;
  totalPrayerCount: number; // 이번 기간 aggregate (명세 55)
  updates: PrayerUpdateView[];
  closedAt: string | null;
}

export interface PrayerUpdateView {
  id: string;
  type: PrayerUpdateType;
  content: string | null;
  createdAt: string;
}

/** 참여자용 상세 (명세 20/28/34) */
export interface ParticipantPrayerDetail {
  prayerId: string;
  owner: PublicProfile;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  status: PrayerStatus;
  daysLeft: number;
  checkedToday: boolean;
  participantId: string;
  participantStatus: ParticipantStatus;
  /** 지난 7일 중 함께 기도한 일수 (명세 20) */
  recentDays: number;
  recentWindow: number;
  latestUpdate: PrayerUpdateView | null;
}

/** shareToken join 미리보기 (명세 13/32) */
export interface JoinPreview {
  shareToken: string;
  /** OWNER/PARTICIPANT(=접근 권한 있는 뷰어)에게만 노출. 그 외 null */
  prayerId: string | null;
  owner: PublicProfile;
  title: string;
  description: string | null;
  startDate: string;
  endDate: string;
  status: PrayerStatus;
  daysLeft: number;
  /** 현재 접속자와의 관계 */
  viewerRelation: "GUEST" | "OWNER" | "PARTICIPANT" | "NONE";
  latestUpdate: PrayerUpdateView | null;
}
