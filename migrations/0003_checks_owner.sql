-- ============================================================
-- 작성자 본인도 자기 기도제목에 체크할 수 있도록 participant_id 를 NULL 허용.
-- SQLite 는 컬럼 NOT NULL 제거를 직접 지원하지 않으므로 테이블을 재생성한다.
-- 기존 체크 데이터는 그대로 보존.
-- ============================================================

create table prayer_checks_new (
  id             text primary key,
  prayer_id      text not null references prayers(id),
  participant_id text references prayer_participants(id),
  user_id        text not null references users(id),
  check_date     text not null,
  created_at     text not null default (datetime('now')),
  unique (prayer_id, user_id, check_date)
);

insert into prayer_checks_new (id, prayer_id, participant_id, user_id, check_date, created_at)
  select id, prayer_id, participant_id, user_id, check_date, created_at from prayer_checks;

drop table prayer_checks;
alter table prayer_checks_new rename to prayer_checks;

create index if not exists checks_prayer_idx on prayer_checks(prayer_id);
create index if not exists checks_participant_idx on prayer_checks(participant_id);
