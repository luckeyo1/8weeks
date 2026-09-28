-- ============================================================
-- 아이디/비밀번호 로그인 지원: users 에 컬럼 추가
-- (SQLite: UNIQUE 는 별도 인덱스로 부여)
-- ============================================================

alter table users add column username text;
alter table users add column password_hash text;
alter table users add column church_name text;

create unique index if not exists users_username_idx on users(username);
