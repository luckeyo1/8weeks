-- ============================================================
-- 기도 동행 — Cloudflare D1 (SQLite) 초기 스키마
-- Postgres 대비 차이: ENUM→TEXT+CHECK, uuid 는 애플리케이션 생성,
-- timestamptz→TEXT(ISO), 권한은 서버 서비스 레이어에서 검증(RLS 없음)
-- ============================================================

-- users (프로필). id 는 Google sub 기반. nickname NULL 이면 온보딩 미완료.
create table if not exists users (
  id                text primary key,
  email             text,
  nickname          text,
  profile_image_url text,
  is_admin          integer not null default 0,
  created_at        text not null default (datetime('now')),
  updated_at        text not null default (datetime('now'))
);

-- prayers
create table if not exists prayers (
  id              text primary key,
  owner_id        text not null references users(id),
  title           text not null,
  description     text,
  status          text not null default 'ACTIVE'
                  check (status in ('ACTIVE','EXPIRED','ANSWERED','CLOSED','DELETED')),
  start_date      text not null,   -- YYYY-MM-DD
  end_date        text not null,   -- YYYY-MM-DD
  share_token     text not null unique,
  extension_count integer not null default 0,
  created_at      text not null default (datetime('now')),
  updated_at      text not null default (datetime('now')),
  closed_at       text,
  check (length(title) between 1 and 50),
  check (description is null or length(description) <= 500),
  check (end_date >= start_date)
);
create index if not exists prayers_owner_idx on prayers(owner_id);
create index if not exists prayers_share_token_idx on prayers(share_token);

-- prayer_participants (한 기도에 한 사용자 1행)
create table if not exists prayer_participants (
  id         text primary key,
  prayer_id  text not null references prayers(id),
  user_id    text not null references users(id),
  status     text not null default 'ACTIVE'
             check (status in ('ACTIVE','LEFT','COMPLETED')),
  joined_at  text not null default (datetime('now')),
  left_at    text,
  unique (prayer_id, user_id)
);
create index if not exists participants_prayer_idx on prayer_participants(prayer_id);
create index if not exists participants_user_idx on prayer_participants(user_id);

-- prayer_checks (같은 날 중복 불가)
create table if not exists prayer_checks (
  id             text primary key,
  prayer_id      text not null references prayers(id),
  participant_id text references prayer_participants(id), -- 작성자 본인 체크는 NULL
  user_id        text not null references users(id),
  check_date     text not null,   -- YYYY-MM-DD
  created_at     text not null default (datetime('now')),
  unique (prayer_id, user_id, check_date)
);
create index if not exists checks_prayer_idx on prayer_checks(prayer_id);
create index if not exists checks_participant_idx on prayer_checks(participant_id);

-- prayer_updates
create table if not exists prayer_updates (
  id         text primary key,
  prayer_id  text not null references prayers(id),
  type       text not null check (type in ('EXTENDED','CHANGED','ANSWERED','CLOSED')),
  content    text,
  created_at text not null default (datetime('now'))
);
create index if not exists updates_prayer_idx on prayer_updates(prayer_id);

-- sessions (선택적 서버측 세션 무효화용; 기본 인증은 서명 쿠키라 필수는 아님)
create table if not exists sessions (
  id         text primary key,
  user_id    text not null references users(id),
  created_at text not null default (datetime('now')),
  expires_at text not null
);
create index if not exists sessions_user_idx on sessions(user_id);
