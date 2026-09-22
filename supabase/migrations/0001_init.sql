-- ============================================================
-- 기도 동행 (Prayer Together) — 초기 스키마
-- 명세 30(DB 설계) / 31~33(권한·shareToken·삭제) / 64~65(상태·날짜)
-- ============================================================

-- 확장: gen_random_uuid()
create extension if not exists "pgcrypto";

-- ── ENUM ────────────────────────────────────────────────
do $$ begin
  create type prayer_status as enum ('ACTIVE', 'EXPIRED', 'ANSWERED', 'CLOSED', 'DELETED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type participant_status as enum ('ACTIVE', 'LEFT', 'COMPLETED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type prayer_update_type as enum ('EXTENDED', 'CHANGED', 'ANSWERED', 'CLOSED');
exception when duplicate_object then null; end $$;

-- ── users (프로필) ──────────────────────────────────────
-- id 는 auth.users 의 id 와 동일. 민감정보(email)는 본인만 조회 가능(RLS).
create table if not exists public.users (
  id                uuid primary key references auth.users (id) on delete cascade,
  email             text,
  nickname          text not null,
  profile_image_url text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── prayers ─────────────────────────────────────────────
create table if not exists public.prayers (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references public.users (id) on delete cascade,
  title           text not null check (char_length(title) between 1 and 50),
  description     text check (char_length(description) <= 500),
  status          prayer_status not null default 'ACTIVE',
  start_date      date not null,
  end_date        date not null,
  share_token     text not null unique,
  extension_count int not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  closed_at       timestamptz,
  constraint prayers_date_order check (end_date >= start_date)
);
create index if not exists prayers_owner_idx on public.prayers (owner_id);
create index if not exists prayers_share_token_idx on public.prayers (share_token);

-- ── prayer_participants ─────────────────────────────────
create table if not exists public.prayer_participants (
  id         uuid primary key default gen_random_uuid(),
  prayer_id  uuid not null references public.prayers (id) on delete cascade,
  user_id    uuid not null references public.users (id) on delete cascade,
  status     participant_status not null default 'ACTIVE',
  joined_at  timestamptz not null default now(),
  left_at    timestamptz,
  -- 명세 16/74: 한 기도제목에 한 사용자는 하나의 참여 행만
  constraint prayer_participants_unique unique (prayer_id, user_id)
);
create index if not exists participants_prayer_idx on public.prayer_participants (prayer_id);
create index if not exists participants_user_idx on public.prayer_participants (user_id);

-- ── prayer_checks ───────────────────────────────────────
-- check_date 는 사용자의 local timezone 기준 날짜(date). (명세 8/19/65)
create table if not exists public.prayer_checks (
  id             uuid primary key default gen_random_uuid(),
  prayer_id      uuid not null references public.prayers (id) on delete cascade,
  participant_id uuid not null references public.prayer_participants (id) on delete cascade,
  user_id        uuid not null references public.users (id) on delete cascade,
  check_date     date not null,
  created_at     timestamptz not null default now(),
  -- 명세 8/68: 동일 날짜 중복 체크 불가 (동시요청도 DB에서 차단)
  constraint prayer_checks_unique unique (prayer_id, user_id, check_date)
);
create index if not exists checks_prayer_idx on public.prayer_checks (prayer_id);
create index if not exists checks_participant_idx on public.prayer_checks (participant_id);

-- ── prayer_updates ──────────────────────────────────────
create table if not exists public.prayer_updates (
  id         uuid primary key default gen_random_uuid(),
  prayer_id  uuid not null references public.prayers (id) on delete cascade,
  type       prayer_update_type not null,
  content    text check (char_length(content) <= 500),
  created_at timestamptz not null default now()
);
create index if not exists updates_prayer_idx on public.prayer_updates (prayer_id);

-- ── updated_at 자동 갱신 트리거 ─────────────────────────
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_users_updated on public.users;
create trigger trg_users_updated before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists trg_prayers_updated on public.prayers;
create trigger trg_prayers_updated before update on public.prayers
  for each row execute function public.set_updated_at();
