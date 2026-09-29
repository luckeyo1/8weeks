-- 관리자 플래그. 콘솔에서 update users set is_admin=1 where username='...' 로 지정.
alter table users add column is_admin integer not null default 0;
