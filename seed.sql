-- ============================================================
-- 개발용 seed (Cloudflare D1). 로컬: npm run db:seed:local
-- 사용자 4명 / 기도제목 5개 (ACTIVE, EXPIRED, ANSWERED 포함)
-- ============================================================

insert or ignore into users (id, email, nickname, profile_image_url) values
  ('seed-minsu',  'minsu@example.com',   '민수', null),
  ('seed-jihye',  'jihye@example.com',   '지혜', null),
  ('seed-junho',  'junho@example.com',   '준호', null),
  ('seed-eunsng', 'eunsung@example.com', '은성', null);

insert or ignore into prayers
  (id, owner_id, title, description, status, start_date, end_date, share_token, extension_count, closed_at)
values
  ('seed-prayer-1', 'seed-minsu',
   '취업 과정 가운데 좋은 길이 열리도록',
   '다음 주 최종 면접이 있습니다. 결과보다 하나님을 의지할 수 있도록 함께 기도해주세요.',
   'ACTIVE', date('now','-2 day'), date('now','+5 day'), 'seedtokenminsuACTIVE01', 0, null),

  ('seed-prayer-2', 'seed-jihye',
   '가족의 건강을 위해',
   '어머니 수술이 잘 마무리되고 회복이 빠르도록 기도 부탁드려요.',
   'ACTIVE', date('now'), date('now','+7 day'), 'seedtokenjihyeACTIVE02', 0, null),

  ('seed-prayer-3', 'seed-junho',
   '진로를 놓고 지혜를 구합니다',
   '어떤 길로 가야 할지 마음이 복잡합니다. 분별할 수 있도록 함께해주세요.',
   'EXPIRED', date('now','-10 day'), date('now','-1 day'), 'seedtokenjunhoEXPIRE3', 1, null),

  ('seed-prayer-4', 'seed-minsu',
   '이사할 집을 찾도록',
   null,
   'ANSWERED', date('now','-30 day'), date('now','-5 day'), 'seedtokenminsuANSWER04', 0, datetime('now')),

  ('seed-prayer-5', 'seed-eunsng',
   '새 학기를 잘 시작하도록',
   '아이가 새로운 환경에 잘 적응하도록 한 달간 함께 기도해주세요.',
   'ACTIVE', date('now','-3 day'), date('now','+27 day'), 'seedtokeneunsngACTIV05', 0, null);

insert or ignore into prayer_participants (id, prayer_id, user_id, status) values
  ('seed-part-1', 'seed-prayer-1', 'seed-jihye',  'ACTIVE'),
  ('seed-part-2', 'seed-prayer-1', 'seed-junho',  'ACTIVE'),
  ('seed-part-3', 'seed-prayer-2', 'seed-eunsng', 'ACTIVE'),
  ('seed-part-4', 'seed-prayer-3', 'seed-minsu',  'ACTIVE'),
  ('seed-part-5', 'seed-prayer-4', 'seed-jihye',  'COMPLETED');

insert or ignore into prayer_checks (id, prayer_id, participant_id, user_id, check_date) values
  ('seed-check-1', 'seed-prayer-1', 'seed-part-1', 'seed-jihye', date('now','-1 day'));

insert or ignore into prayer_updates (id, prayer_id, type, content) values
  ('seed-update-1', 'seed-prayer-4', 'ANSWERED',
   '기도해주신 덕분에 마음에 드는 집으로 이사하게 되었어요. 함께 기도해주셔서 감사합니다.');
