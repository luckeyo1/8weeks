-- 성경 하이라이트: 절 단위로 색을 표시한다. 본인에게만 보인다(다른 이용자·함께 기도하는 사람에게 공개 안 함).
-- (사용자, 책, 장, 절)마다 한 행. 색을 바꾸면 color·updated_at 만 바뀐다. 계정 삭제 시 함께 지운다.
-- D1 콘솔은 한 줄 입력이라 아래 두 문장을 한 줄씩 실행하면 된다.
create table if not exists bible_highlights (user_id text not null references users(id), book integer not null, chapter integer not null, verse integer not null, color text not null check (color in ('yellow','green','blue','pink')), created_at text not null default (datetime('now')), updated_at text not null default (datetime('now')), primary key (user_id, book, chapter, verse));
create index if not exists bible_highlights_recent_idx on bible_highlights(user_id, updated_at);
