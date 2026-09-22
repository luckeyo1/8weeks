-- ============================================================
-- 개발용 seed (명세 94)
-- 사용자 4명 / 기도제목 5개 (ACTIVE, EXPIRED, ANSWERED 포함)
--
-- 로컬 Supabase(supabase db reset) 에서 실행됩니다.
-- auth.users 에 직접 삽입하므로 로컬 개발 전용입니다.
-- 비밀번호 로그인은 사용하지 않지만, 로컬에서 계정 존재를 위해
-- encrypted_password 를 넣어둡니다. (email: 아래, pw: password123)
-- ============================================================

-- 고정 UUID
-- 민수  : 11111111-1111-1111-1111-111111111111
-- 지혜  : 22222222-2222-2222-2222-222222222222
-- 준호  : 33333333-3333-3333-3333-333333333333
-- 은성  : 44444444-4444-4444-4444-444444444444

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'minsu@example.com',  crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'jihye@example.com',  crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'junho@example.com',  crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}'),
  ('00000000-0000-0000-0000-000000000000', '44444444-4444-4444-4444-444444444444', 'authenticated', 'authenticated', 'eunsung@example.com', crypt('password123', gen_salt('bf')), now(), now(), now(), '{"provider":"email","providers":["email"]}', '{}')
on conflict (id) do nothing;

insert into public.users (id, email, nickname, profile_image_url)
values
  ('11111111-1111-1111-1111-111111111111', 'minsu@example.com',   '민수', null),
  ('22222222-2222-2222-2222-222222222222', 'jihye@example.com',   '지혜', null),
  ('33333333-3333-3333-3333-333333333333', 'junho@example.com',   '준호', null),
  ('44444444-4444-4444-4444-444444444444', 'eunsung@example.com', '은성', null)
on conflict (id) do nothing;

-- 기도제목 5개
-- 1) 민수 - ACTIVE (진행 중, 오늘 기준 D-5)
-- 2) 지혜 - ACTIVE
-- 3) 준호 - EXPIRED (종료일 지남, 작성자 정리 대기)
-- 4) 민수 - ANSWERED (응답 경험)
-- 5) 은성 - ACTIVE (직접 설정 30일)
insert into public.prayers (id, owner_id, title, description, status, start_date, end_date, share_token, extension_count, closed_at)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111',
   '취업 과정 가운데 좋은 길이 열리도록',
   '다음 주 최종 면접이 있습니다. 결과보다 하나님을 의지할 수 있도록 함께 기도해주세요.',
   'ACTIVE', current_date - 2, current_date + 5, 'seedtokenminsuACTIVE01', 0, null),

  ('aaaaaaaa-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222',
   '가족의 건강을 위해',
   '어머니 수술이 잘 마무리되고 회복이 빠르도록 기도 부탁드려요.',
   'ACTIVE', current_date, current_date + 7, 'seedtokenjihyeACTIVE02', 0, null),

  ('aaaaaaaa-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333',
   '진로를 놓고 지혜를 구합니다',
   '어떤 길로 가야 할지 마음이 복잡합니다. 분별할 수 있도록 함께해주세요.',
   'EXPIRED', current_date - 10, current_date - 1, 'seedtokenjunhoEXPIRE3', 1, null),

  ('aaaaaaaa-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111',
   '이사할 집을 찾도록',
   null,
   'ANSWERED', current_date - 30, current_date - 5, 'seedtokenminsuANSWER04', 0, now()),

  ('aaaaaaaa-0000-0000-0000-000000000005', '44444444-4444-4444-4444-444444444444',
   '새 학기를 잘 시작하도록',
   '아이가 새로운 환경에 잘 적응하도록 한 달간 함께 기도해주세요.',
   'ACTIVE', current_date - 3, current_date + 27, 'seedtokeneunsngACTIV05', 0, null)
on conflict (id) do nothing;

-- 참여자
-- 지혜, 준호 -> 민수(1) 기도에 참여
-- 은성 -> 지혜(2) 기도에 참여
-- 민수 -> 준호(3) 기도에 참여
-- 지혜 -> 민수(4, ANSWERED) 기도에 참여 (완료)
insert into public.prayer_participants (id, prayer_id, user_id, status)
values
  ('bbbbbbbb-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'ACTIVE'),
  ('bbbbbbbb-0000-0000-0000-000000000002', 'aaaaaaaa-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'ACTIVE'),
  ('bbbbbbbb-0000-0000-0000-000000000003', 'aaaaaaaa-0000-0000-0000-000000000002', '44444444-4444-4444-4444-444444444444', 'ACTIVE'),
  ('bbbbbbbb-0000-0000-0000-000000000004', 'aaaaaaaa-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'ACTIVE'),
  ('bbbbbbbb-0000-0000-0000-000000000005', 'aaaaaaaa-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', 'COMPLETED')
on conflict (id) do nothing;

-- 일부 기도 체크 (오늘 지혜가 민수 기도에 체크)
insert into public.prayer_checks (prayer_id, participant_id, user_id, check_date)
values
  ('aaaaaaaa-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', current_date - 1)
on conflict do nothing;

-- 응답 업데이트 (기도 4)
insert into public.prayer_updates (prayer_id, type, content)
values
  ('aaaaaaaa-0000-0000-0000-000000000004', 'ANSWERED', '기도해주신 덕분에 마음에 드는 집으로 이사하게 되었어요. 함께 기도해주셔서 감사합니다.')
on conflict do nothing;
