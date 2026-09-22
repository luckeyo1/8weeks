/**
 * Supabase 데이터베이스 타입 (수기 정의, 0001/0002 마이그레이션과 일치).
 * @supabase/supabase-js 가 기대하는 GenericSchema 구조(Tables/Views/Functions/
 * Enums/CompositeTypes + 각 테이블의 Row/Insert/Update/Relationships)에 맞춘다.
 * 실서비스에서는 `supabase gen types typescript` 로 재생성할 수 있습니다.
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
  id: string;
  email: string | null;
  nickname: string;
  profile_image_url: string | null;
  created_at: string;
  updated_at: string;
}

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
}

export type ParticipantRow = {
  id: string;
  prayer_id: string;
  user_id: string;
  status: ParticipantStatus;
  joined_at: string;
  left_at: string | null;
}

export type PrayerCheckRow = {
  id: string;
  prayer_id: string;
  participant_id: string;
  user_id: string;
  check_date: string; // YYYY-MM-DD (사용자 local 날짜)
  created_at: string;
}

export type PrayerUpdateRow = {
  id: string;
  prayer_id: string;
  type: PrayerUpdateType;
  content: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: UserRow;
        Insert: Pick<UserRow, "id" | "nickname"> &
          Partial<Pick<UserRow, "email" | "profile_image_url">>;
        Update: Partial<UserRow>;
        Relationships: [];
      };
      prayers: {
        Row: PrayerRow;
        Insert: Pick<
          PrayerRow,
          "owner_id" | "title" | "start_date" | "end_date" | "share_token"
        > &
          Partial<
            Pick<PrayerRow, "id" | "description" | "status" | "extension_count">
          >;
        Update: Partial<PrayerRow>;
        Relationships: [];
      };
      prayer_participants: {
        Row: ParticipantRow;
        Insert: Pick<ParticipantRow, "prayer_id" | "user_id"> &
          Partial<Pick<ParticipantRow, "id" | "status">>;
        Update: Partial<ParticipantRow>;
        Relationships: [];
      };
      prayer_checks: {
        Row: PrayerCheckRow;
        Insert: Pick<
          PrayerCheckRow,
          "prayer_id" | "participant_id" | "user_id" | "check_date"
        >;
        Update: Partial<PrayerCheckRow>;
        Relationships: [];
      };
      prayer_updates: {
        Row: PrayerUpdateRow;
        Insert: Pick<PrayerUpdateRow, "prayer_id" | "type"> &
          Partial<Pick<PrayerUpdateRow, "content">>;
        Update: Partial<PrayerUpdateRow>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_prayer_owner: {
        Args: { p_prayer: string };
        Returns: boolean;
      };
      is_prayer_participant: {
        Args: { p_prayer: string };
        Returns: boolean;
      };
    };
    Enums: {
      prayer_status: PrayerStatus;
      participant_status: ParticipantStatus;
      prayer_update_type: PrayerUpdateType;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
