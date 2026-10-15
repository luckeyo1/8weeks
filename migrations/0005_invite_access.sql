-- 초대 링크 무효화 + 동행자 접근 해제(P0)
alter table prayers add column share_revoked integer not null default 0;
alter table prayer_participants add column removed integer not null default 0;
