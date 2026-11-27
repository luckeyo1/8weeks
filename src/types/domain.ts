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
  /** 내가 만든 기도에서만: 함께 기도하는 사람 이름(참여 순). 사람이 먼저 보이게(원칙) */
  companions?: string[];
}

/** 홈 "시작하기" 체크리스트 진행 (기존 데이터에서 계산) */
export interface StarterProgress {
  hasPrayer: boolean; // 기도제목을 한 번이라도 만들었는지
  hasCompanion: boolean; // 내 기도에 한 명이라도 함께한 적이 있는지
  invitePrayerId: string | null; // 초대 단계에서 열어 줄 진행 중인 기도
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

/** 관리자 › 성경: 전체 합계만 (개인별 읽기 기록은 담지 않음) */
export interface AdminBibleStats {
  /** 읽은 사람 수 (중복 제외) */
  readers: { today: number; last7: number; last30: number; total: number };
  /** 기록된 장 수 */
  chapters: { today: number; last7: number; total: number };
  /** 최근 14일 (오래된 날부터, 빈 날은 0) */
  daily: { date: string; readers: number; chapters: number }[];
  /** 최근 30일 많이 읽힌 책 (최대 5권) */
  topBooks: { book: number; name: string; chapters: number }[];
  /** 하이라이트 (migrations/0014 미적용이면 null) */
  highlights: { users: number; total: number } | null;
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

/** 이용 통계 한 줄 (관리자). 기능별 하루 사용 횟수 합계 — 개인 식별 정보 없음 */
export interface UsageEventStat {
  event: string;
  label: string;
  today: number;
  /** 오늘 포함 최근 7일 */
  last7: number;
  /** 그 전 7일 */
  prev7: number;
}

export interface UsageStats {
  rows: UsageEventStat[];
  /** 최근 7일 성경 장 열기 대비 듣기 시작 (0~1, 분모 0 이면 null) */
  listenStartRate: number | null;
  /** 최근 7일 듣기 시작 대비 끝까지 듣기 (0~1, 분모 0 이면 null) */
  listenCompleteRate: number | null;
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
