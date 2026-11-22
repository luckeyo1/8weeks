-- 성경 읽은 곳(장 단위) 기록. 본인에게만 보이는 개인 기록.
-- book 은 1(창세기)~66(요한계시록). 같은 장을 다른 날 다시 읽으면 행이 하나 더 생긴다.
-- 날짜별 "읽은 날" 표시는 0008 의 bible_readings 가 맡고, 저장 시 함께 갱신한다.
-- D1 콘솔은 한 줄 입력이라 주석 없이 아래 create 문만 실행하면 된다.
create table if not exists bible_chapter_reads (
  id         text primary key,
  user_id    text not null references users(id),
  book       integer not null check (book between 1 and 66),
  chapter    integer not null check (chapter >= 1),
  read_date  text not null,   -- YYYY-MM-DD (서비스 timezone 기준 날짜)
  created_at text not null default (datetime('now')),
  unique (user_id, read_date, book, chapter)
);
