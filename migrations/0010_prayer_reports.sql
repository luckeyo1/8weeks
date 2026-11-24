-- 기도제목 신고 (구글 플레이 사용자 제작 콘텐츠 정책: 앱 안에서 신고할 수 있어야 한다)
-- 함께 기도하는 사람이 부적절한 기도제목을 신고하면 운영자가 관리자 화면에서 확인한다.
-- status: OPEN(접수) → RESOLVED(확인 완료, 조치 없음) / HIDDEN(기도제목 숨김 조치)
-- D1 콘솔은 한 줄 입력이라 주석 없이 아래 create 문 3개를 하나씩 실행하면 된다.
create table if not exists prayer_reports (
  id          text primary key,
  prayer_id   text not null references prayers(id),
  reporter_id text not null references users(id),
  reason      text not null check (reason in ('INAPPROPRIATE', 'HARASSMENT', 'SPAM', 'PRIVACY', 'OTHER')),
  detail      text,
  status      text not null default 'OPEN' check (status in ('OPEN', 'RESOLVED', 'HIDDEN')),
  created_at  text not null default (datetime('now')),
  resolved_at text
);
-- 같은 사람이 같은 기도제목을 처리 전에 여러 번 신고하지 않도록
create unique index if not exists prayer_reports_open_once on prayer_reports (prayer_id, reporter_id) where status = 'OPEN';
create index if not exists prayer_reports_status on prayer_reports (status, created_at);
