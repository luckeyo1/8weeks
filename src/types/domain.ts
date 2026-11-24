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

/** 작성자용 동행자 요약 (명단/해제용) */
export interface OwnerParticipant {
  participantId: string;
  nickname: string | null;
  joinedAt: string;
  /** 이번 기간 함께 기도한 횟수(개별 — 작성자 운영용) */
  checkedCount: number;
}

/** 작성자용 상세 */
export interface OwnerPrayerDetail extends OwnedPrayerSummary {
  shareToken: string;
  shareUrl: string;
  shareRevoked: boolean; // 링크 무효화 여부
  totalPrayerCount: number; // 이번 기간 aggregate (명세 55)
  participants: OwnerParticipant[];
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

/** ── 관리자 대시보드 ─────────────────────────────── */
export interface AdminOverview {
  totalUsers: number;
  totalPrayers: number; // DELETED 제외
  byStatus: { ACTIVE: number; EXPIRED: number; ANSWERED: number; CLOSED: number };
  totalParticipations: number; // LEFT 제외
  totalChecks: number;
  checksToday: number;
}

export interface AdminUser {
  id: string;
  username: string | null;
  nickname: string | null;
  churchName: string | null;
  createdAt: string;
  ownedCount: number;
  joinedCount: number;
}

export interface AdminPrayerParticipant {
  nickname: string | null;
  username: string | null;
  checkedCount: number;
}

export interface AdminPrayer {
  prayerId: string;
  title: string;
  description: string | null;
  status: PrayerStatus;
  ownerName: string | null;
  ownerUsername: string | null;
  startDate: string;
  endDate: string;
  createdAt: string;
  participantCount: number;
  checkCount: number;
  participants: AdminPrayerParticipant[];
}

/** 관리자: 접수된 신고 (처리 전) */
export interface AdminReport {
  reportId: string;
  prayerId: string;
  prayerTitle: string;
  prayerDescription: string | null;
  ownerName: string | null;
  ownerUsername: string | null;
  reporterName: string | null;
  reporterUsername: string | null;
  reason: string;
  detail: string | null;
  createdAt: string;
}

/**
 * shareToken join 미리보기 (명세 13/32).
 * 개인정보 보호(P0): 수락 전(GUEST/NONE)에는 본문(title/description)을
 * 서버에서 아예 내려주지 않는다. OWNER/PARTICIPANT 만 내용 접근.
 */
export interface JoinPreview {
  shareToken: string;
  /** OWNER/PARTICIPANT(=접근 권한 있는 뷰어)에게만 노출. 그 외 null */
  prayerId: string | null;
  owner: PublicProfile;
  /** 권한 있는 뷰어에게만 채워짐. 그 외 null */
  title: string | null;
  description: string | null;
  canViewContent: boolean;
  startDate: string;
  endDate: string;
  status: PrayerStatus;
  daysLeft: number;
  /** 현재 접속자와의 관계 */
  viewerRelation: "GUEST" | "OWNER" | "PARTICIPANT" | "NONE";
  latestUpdate: PrayerUpdateView | null;
}

/**
 * 성경 읽은 곳 기록 (본인에게만 보임). 장은 chapterKey(book*1000+chapter) 숫자로 주고받는다.
 */
export interface BibleReadingState {
  /** false 면 기록 기능을 쓸 수 없는 상태(마이그레이션 미적용 등) — 기록 UI 를 숨긴다 */
  available: boolean;
  today: string; // YYYY-MM-DD
  weekDates: string[]; // 이번 주 일~토
  readDates: string[]; // 이번 주 중 읽은 날
  todayKeys: number[]; // 오늘 읽은 장
  readKeys: number[]; // 지금까지 한 번이라도 읽은 장 (통독 현황)
  lastRead: number | null; // 가장 최근에 기록한 장 — 다음 장을 미리 선택하는 데 쓴다
}
