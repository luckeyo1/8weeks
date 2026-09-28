/**
 * D1(SQLite) 테이블 Row 타입 (migrations/0001_init.sql 과 일치).
 * SQLite 에는 ENUM 이 없어 상태값은 TEXT + CHECK 제약으로 관리하며,
 * 애플리케이션에서는 아래 유니온 타입으로 다룬다.
 */

export type PrayerStatus =
  | "ACTIVE"
  | "EXPIRED"
  | "ANSWERED"
  | "CLOSED"
  | "DELETED";

export type ParticipantStatus = "ACTIVE" | "LEFT" | "COMPLETED";

export type PrayerUpdateType = "EXTENDED" | "CHANGED" | "ANSWERED" | "CLOSED";

export type UserRow = {
  id: string; // 앱에서 생성하는 uuid
  username: string | null; // 로그인 아이디 (중복불가)
  password_hash: string | null; // PBKDF2 해시
  church_name: string | null; // 교회명 (선택)
  email: string | null; // 미사용(확장 여지)
  nickname: string | null; // 이름(화면 표시)
  profile_image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type PrayerRow = {
  id: string;
  owner_id: string;
  title: string;
  description: string | null;
  status: PrayerStatus;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  share_token: string;
  extension_count: number;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
};

export type ParticipantRow = {
  id: string;
  prayer_id: string;
  user_id: string;
  status: ParticipantStatus;
  joined_at: string;
  left_at: string | null;
};

export type PrayerCheckRow = {
  id: string;
  prayer_id: string;
  participant_id: string;
  user_id: string;
  check_date: string; // YYYY-MM-DD (서비스 timezone 기준 날짜)
  created_at: string;
};

export type PrayerUpdateRow = {
  id: string;
  prayer_id: string;
  type: PrayerUpdateType;
  content: string | null;
  created_at: string;
};
