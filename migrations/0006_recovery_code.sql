-- 계정 복구 코드(P1). 가입 시 1회 발급·해시 저장. 분실 시 자기복구 또는 관리자 재발급.
alter table users add column recovery_code_hash text;
