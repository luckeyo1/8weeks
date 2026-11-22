-- 성경 읽기 습관 체크(하루 1회). 본인에게만 보이는 개인 기록 — 동행자에게 공개하지 않는다.
-- unique(user_id, read_date) 가 같은 날 중복을 막고, user_id 조회 인덱스 역할도 한다.
create table if not exists bible_readings (
  id         text primary key,
  user_id    text not null references users(id),
  read_date  text not null,   -- YYYY-MM-DD (서비스 timezone 기준 날짜)
  created_at text not null default (datetime('now')),
  unique (user_id, read_date)
);
