-- Tasks (a system with no steps, optional duration + notes) and the
-- Content / Code tabs, whose AI weekly plans create tasks tagged with an area.

alter table public.systems
  add column kind text not null default 'routine' check (kind in ('routine', 'task')),
  add column minutes int check (minutes between 1 and 600),
  add column details text check (char_length(details) <= 1000),
  -- which tab created it (null = made on the Systems tab)
  add column area text check (area in ('content', 'code'));

-- Goals typed on a Content / Code tab and the AI's summary of the plan.
create table public.area_plans (
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  area text not null check (area in ('content', 'code')),
  goals text not null default '' check (char_length(goals) <= 2000),
  summary text not null default '' check (char_length(summary) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, area)
);

alter table public.area_plans enable row level security;

create policy "own rows" on public.area_plans
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger set_updated_at before update on public.area_plans
  for each row execute function public.set_updated_at();
