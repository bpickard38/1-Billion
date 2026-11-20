-- Systems rewrite (2026-11-19). Numbered 0016 because 0013-0015
-- (todos_and_planning_chat, demo_seed, demo_seed_goal_progress) were applied
-- to the live database without being committed here; this drops their objects too.
--: the app now only tracks "systems".
-- A system is a habit stack (e.g. Morning: wake up -> water -> meditate ...).
-- Each system has ordered steps and one check-off per day.
--
-- Everything else (goals, habits, schedule/calendar, Google sync, Canvas
-- planner, weekly reviews, skills, push notifications) is dropped here.
-- DESTRUCTIVE: data in those tables is deleted. Export anything you want
-- to keep before running this.

-- ---------------------------------------------------------------------------
-- 1. Stop the hourly notification cron job (0006). Guarded so this runs even
--    where pg_cron was never set up.
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'hourly-notification-tick';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 2. Drop old features
-- ---------------------------------------------------------------------------
drop function if exists public.confirm_planning_draft(uuid);
drop function if exists public.claim_planner_ai();
drop function if exists public.seed_demo();

drop view if exists public.weekly_metric_totals;
drop view if exists public.problem_aggregates;

drop table if exists public.todos cascade;
drop table if exists public.planning_chat_messages cascade;
drop table if exists public.schedule_blocks cascade;
drop table if exists public.schedule_templates cascade;
drop table if exists public.planning_drafts cascade;
drop table if exists public.planning_preferences cascade;
drop table if exists public.canvas_assignments cascade;
drop table if exists public.canvas_connections cascade;
drop table if exists public.google_tokens cascade;
drop table if exists public.notification_log cascade;
drop table if exists public.push_subscriptions cascade;
drop table if exists public.weekly_reviews cascade;
drop table if exists public.daily_entries cascade;
drop table if exists public.metric_logs cascade;
drop table if exists public.metrics cascade;
drop table if exists public.habit_logs cascade;
drop table if exists public.habits cascade;
drop table if exists public.skills cascade;
drop table if exists public.skill_categories cascade;
drop table if exists public.goals cascade;

alter table public.profiles drop column if exists score_weights;
alter table public.profiles drop column if exists north_star;
alter table public.profiles drop column if exists notification_prefs;
alter table public.profiles drop column if exists week_start;
-- Throttle for the "create a system with AI" button (see claim_ai below).
alter table public.profiles add column last_ai_at timestamptz;

-- ---------------------------------------------------------------------------
-- 3. systems
-- ---------------------------------------------------------------------------
create table public.systems (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name text not null check (char_length(name) between 1 and 80),
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.systems enable row level security;

create policy "own rows" on public.systems
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger set_updated_at before update on public.systems
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 4. system_steps: the workflow, in order
-- ---------------------------------------------------------------------------
create table public.system_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  system_id uuid not null references public.systems (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.system_steps enable row level security;

create policy "own rows" on public.system_steps
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger set_updated_at before update on public.system_steps
  for each row execute function public.set_updated_at();

create index system_steps_system_idx on public.system_steps (system_id, sort);

-- ---------------------------------------------------------------------------
-- 5. system_logs: a row means "done on this local date"
-- ---------------------------------------------------------------------------
create table public.system_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  system_id uuid not null references public.systems (id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  unique (system_id, date)
);

alter table public.system_logs enable row level security;

create policy "own rows" on public.system_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index system_logs_user_date_idx on public.system_logs (user_id, date);

-- ---------------------------------------------------------------------------
-- 6. claim_ai(): true at most once per 20 seconds per user, so a stuck
--    button can't run up the AI bill.
-- ---------------------------------------------------------------------------
create function public.claim_ai() returns boolean
language plpgsql security invoker set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  update public.profiles set last_ai_at = now()
    where id = auth.uid() and (last_ai_at is null or last_ai_at < now() - interval '20 seconds');
  return found;
end $$;

revoke all on function public.claim_ai() from public, anon;
grant execute on function public.claim_ai() to authenticated;
