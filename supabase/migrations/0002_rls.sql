-- ============================================================
-- Row Level Security (방어선 - defense in depth)
--
-- 애플리케이션의 권한 검증은 서버(Server Actions/service)에서
-- 명시적으로 수행한다(명세 31/66/67). RLS 는 anon key 로의 직접
-- 접근을 막는 2차 방어선이다. service_role 키는 RLS 를 우회하므로
-- 서버 서비스 레이어에서만 사용하고 절대 클라이언트에 노출하지 않는다.
-- ============================================================

alter table public.users enable row level security;
alter table public.prayers enable row level security;
alter table public.prayer_participants enable row level security;
alter table public.prayer_checks enable row level security;
alter table public.prayer_updates enable row level security;

-- 헬퍼: 현재 사용자가 특정 기도의 owner 인가
create or replace function public.is_prayer_owner(p_prayer uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.prayers p
    where p.id = p_prayer and p.owner_id = auth.uid()
  );
$$;

-- 헬퍼: 현재 사용자가 특정 기도의 참여자인가
create or replace function public.is_prayer_participant(p_prayer uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.prayer_participants pp
    where pp.prayer_id = p_prayer and pp.user_id = auth.uid()
  );
$$;

-- ── users ────────────────────────────────────────────────
drop policy if exists users_select_self on public.users;
create policy users_select_self on public.users
  for select using (id = auth.uid());

drop policy if exists users_insert_self on public.users;
create policy users_insert_self on public.users
  for insert with check (id = auth.uid());

drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users
  for update using (id = auth.uid()) with check (id = auth.uid());

-- ── prayers ──────────────────────────────────────────────
-- 조회: owner 또는 participant 만 (share_token 접근은 서버 service 경유)
drop policy if exists prayers_select on public.prayers;
create policy prayers_select on public.prayers
  for select using (
    owner_id = auth.uid() or public.is_prayer_participant(id)
  );

drop policy if exists prayers_insert on public.prayers;
create policy prayers_insert on public.prayers
  for insert with check (owner_id = auth.uid());

drop policy if exists prayers_update on public.prayers;
create policy prayers_update on public.prayers
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- ── prayer_participants ──────────────────────────────────
drop policy if exists participants_select on public.prayer_participants;
create policy participants_select on public.prayer_participants
  for select using (
    user_id = auth.uid() or public.is_prayer_owner(prayer_id)
  );

drop policy if exists participants_insert on public.prayer_participants;
create policy participants_insert on public.prayer_participants
  for insert with check (user_id = auth.uid());

drop policy if exists participants_update on public.prayer_participants;
create policy participants_update on public.prayer_participants
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── prayer_checks ────────────────────────────────────────
drop policy if exists checks_select on public.prayer_checks;
create policy checks_select on public.prayer_checks
  for select using (
    user_id = auth.uid() or public.is_prayer_owner(prayer_id)
  );

drop policy if exists checks_insert on public.prayer_checks;
create policy checks_insert on public.prayer_checks
  for insert with check (user_id = auth.uid());

-- ── prayer_updates ───────────────────────────────────────
drop policy if exists updates_select on public.prayer_updates;
create policy updates_select on public.prayer_updates
  for select using (
    public.is_prayer_owner(prayer_id) or public.is_prayer_participant(prayer_id)
  );

drop policy if exists updates_insert on public.prayer_updates;
create policy updates_insert on public.prayer_updates
  for insert with check (public.is_prayer_owner(prayer_id));
