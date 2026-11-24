-- 카카오 로그인: 카카오 회원번호로 계정을 찾는다(이메일로 계정을 합치지 않는다).
-- 카카오로만 가입한 사용자는 username/password_hash 가 NULL.
-- D1 콘솔은 한 줄 입력이라 아래 두 문장을 한 줄씩 실행하면 된다.
alter table users add column kakao_id text;
create unique index if not exists users_kakao_id_idx on users(kakao_id);
