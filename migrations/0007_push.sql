-- 웹 푸시 알림 구독(P1 리마인더). 한 사용자가 여러 기기 가능 → endpoint 기준 유일.
create table if not exists push_subscriptions (
  id         text primary key,
  user_id    text not null references users(id),
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at text not null default (datetime('now'))
);
create index if not exists push_subs_user_idx on push_subscriptions(user_id);
