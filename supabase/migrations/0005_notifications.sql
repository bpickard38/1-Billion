-- Phase 9: push notification storage. google_tokens stays deferred to Phase 10.

-- ---------------------------------------------------------------------------
-- push_subscriptions (one row per browser/device the user enabled push on)
-- ---------------------------------------------------------------------------
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

create policy "own rows" on public.push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger set_updated_at before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- notification_log (dedup guard: the cron tick claims a row before sending,
-- so a retry or an overlapping run can't double-send the same notification)
-- ---------------------------------------------------------------------------
create table public.notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  kind text not null check (
    kind in ('today_priority', 'uncomfortable_rep', 'daily_review', 'weekly_review', 'followup_reminder')
  ),
  sent_for date not null,
  ref_id text not null default '',
  sent_at timestamptz not null default now(),
  unique (user_id, kind, sent_for, ref_id)
);

alter table public.notification_log enable row level security;

create policy "own rows" on public.notification_log
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
