-- Systems v2: which days a system runs, what time of day, and per-step ticks.

-- ISO weekdays, 1 = Monday ... 7 = Sunday.
alter table public.systems
  add column days_of_week int[] not null default '{1,2,3,4,5,6,7}'
    check (cardinality(days_of_week) between 1 and 7 and days_of_week <@ '{1,2,3,4,5,6,7}'),
  -- null = anytime
  add column time_of_day text check (time_of_day in ('morning', 'afternoon', 'evening'));

-- A row means "this step was ticked on this local date".
create table public.step_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  step_id uuid not null references public.system_steps (id) on delete cascade,
  system_id uuid not null references public.systems (id) on delete cascade,
  date date not null,
  created_at timestamptz not null default now(),
  unique (step_id, date)
);

alter table public.step_logs enable row level security;

create policy "own rows" on public.step_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index step_logs_system_date_idx on public.step_logs (system_id, date);
