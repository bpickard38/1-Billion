-- Phase 1: core tables, updated_at trigger, RLS.
-- Every table (except profiles, which uses auth.users' own id) has a
-- `user_id uuid references auth.users` column defaulting to auth.uid(),
-- with a single "for all" RLS policy: user_id = auth.uid().
-- push_subscriptions and google_tokens are intentionally excluded (Phase 9 / Phase 10).

-- ---------------------------------------------------------------------------
-- updated_at trigger, shared by every table below
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles (one row per auth user; id doubles as the user identifier)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  timezone text not null default 'America/Denver',
  week_start text not null default 'mon' check (week_start in ('mon')),
  score_weights jsonb not null default '{"output":0.7,"input":0.2,"habit":0.1}'::jsonb,
  north_star text,
  notification_prefs jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

create trigger set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row for every new auth user (public self-serve signup).
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- goals
-- ---------------------------------------------------------------------------
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  level text not null check (level in ('dream', '10yr', '3yr', '1yr', 'quarter', 'month', 'week', 'today')),
  parent_id uuid references public.goals (id) on delete set null,
  title text not null,
  description text,
  target_value numeric,
  target_unit text,
  current_value numeric not null default 0,
  status text not null default 'active' check (status in ('active', 'done', 'dropped')),
  starts_on date,
  ends_on date,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, level, title)
);

alter table public.goals enable row level security;

create policy "own rows" on public.goals
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger set_updated_at before update on public.goals
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- habits
-- ---------------------------------------------------------------------------
create table public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name text not null,
  days_of_week int[] not null default '{1,2,3,4,5,6,7}',
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.habits enable row level security;

create policy "own rows" on public.habits
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger set_updated_at before update on public.habits
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- habit_logs
-- ---------------------------------------------------------------------------
create table public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  habit_id uuid not null references public.habits (id) on delete cascade,
  date date not null,
  done boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (habit_id, date)
);

alter table public.habit_logs enable row level security;

create policy "own rows" on public.habit_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger set_updated_at before update on public.habit_logs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- metrics
-- ---------------------------------------------------------------------------
create table public.metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name text not null,
  unit text not null check (unit in ('count', 'hours', 'dollars')),
  kind text not null check (kind in ('output', 'input', 'habit')),
  daily_target numeric,
  weekly_target numeric,
  sort int not null default 0,
  active boolean not null default true,
  entry_mode text not null check (entry_mode in ('counter', 'daily_review')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.metrics enable row level security;

create policy "own rows" on public.metrics
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger set_updated_at before update on public.metrics
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- metric_logs
-- ---------------------------------------------------------------------------
create table public.metric_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  metric_id uuid not null references public.metrics (id) on delete cascade,
  date date not null,
  value numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (metric_id, date)
);

alter table public.metric_logs enable row level security;

create policy "own rows" on public.metric_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger set_updated_at before update on public.metric_logs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- daily_entries
-- ---------------------------------------------------------------------------
create table public.daily_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  date date not null,
  priority_text text,
  priority_goal_id uuid references public.goals (id) on delete set null,
  accomplished text,
  learned text,
  tomorrow_priority text,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table public.daily_entries enable row level security;

create policy "own rows" on public.daily_entries
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger set_updated_at before update on public.daily_entries
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- weekly_reviews
-- ---------------------------------------------------------------------------
create table public.weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  week_start date not null,
  answers jsonb not null default '{}'::jsonb,
  score numeric,
  breakdown jsonb,
  biggest_issue text,
  closed_at timestamptz,
  auto_closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, week_start)
);

alter table public.weekly_reviews enable row level security;

create policy "own rows" on public.weekly_reviews
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger set_updated_at before update on public.weekly_reviews
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- schedule_templates
-- ---------------------------------------------------------------------------
create table public.schedule_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  weekday int not null check (weekday between 1 and 7),
  start_time time not null,
  end_time time not null,
  title text not null,
  category text not null check (
    category in (
      'Faith/Family', 'Health', 'School', 'Startup-Customers',
      'Startup-Build', 'Startup-Strategy', 'Learning', 'Racing', 'Rest'
    )
  ),
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, weekday, title)
);

alter table public.schedule_templates enable row level security;

create policy "own rows" on public.schedule_templates
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger set_updated_at before update on public.schedule_templates
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- schedule_blocks
-- ---------------------------------------------------------------------------
create table public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  date date not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  title text not null,
  category text not null check (
    category in (
      'Faith/Family', 'Health', 'School', 'Startup-Customers',
      'Startup-Build', 'Startup-Strategy', 'Learning', 'Racing', 'Rest'
    )
  ),
  done boolean not null default false,
  source text not null default 'manual' check (source in ('template', 'manual', 'google')),
  google_event_id text,
  google_etag text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.schedule_blocks enable row level security;

create policy "own rows" on public.schedule_blocks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger set_updated_at before update on public.schedule_blocks
  for each row execute function public.set_updated_at();

create index schedule_blocks_user_date_idx on public.schedule_blocks (user_id, date);

-- ---------------------------------------------------------------------------
-- contacts
-- ---------------------------------------------------------------------------
create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name text not null,
  company text,
  industry text,
  role text,
  type text check (type in ('customer_research', 'founder', 'industry_expert', 'vendor')),
  email text,
  phone text,
  linkedin text,
  where_met text,
  expertise text,
  interests text,
  how_i_can_help text,
  last_contact_on date,
  follow_up_on date,
  would_pilot text check (would_pilot in ('yes', 'maybe', 'no')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.contacts enable row level security;

create policy "own rows" on public.contacts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger set_updated_at before update on public.contacts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- interviews
-- ---------------------------------------------------------------------------
create table public.interviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  contact_id uuid not null references public.contacts (id) on delete cascade,
  date date not null,
  notes text,
  current_solution text,
  estimated_cost numeric,
  pain_score int check (pain_score between 1 and 10),
  would_pilot text check (would_pilot in ('yes', 'maybe', 'no')),
  follow_up text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.interviews enable row level security;

create policy "own rows" on public.interviews
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger set_updated_at before update on public.interviews
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- problems
-- ---------------------------------------------------------------------------
create table public.problems (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  title text not null,
  description text,
  user_role text,
  buyer text,
  frequency text,
  existing_solution text,
  labor_cost text,
  revenue_impact text,
  urgency int check (urgency between 1 and 10),
  wtp text,
  ai_opportunity int check (ai_opportunity between 1 and 10),
  competition text,
  tam text,
  expansion text,
  access text,
  score int check (score between 0 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, title)
);

alter table public.problems enable row level security;

create policy "own rows" on public.problems
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger set_updated_at before update on public.problems
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- interview_problems
-- ---------------------------------------------------------------------------
create table public.interview_problems (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  interview_id uuid not null references public.interviews (id) on delete cascade,
  problem_id uuid not null references public.problems (id) on delete cascade,
  pain_score int check (pain_score between 1 and 10),
  quote text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (interview_id, problem_id)
);

alter table public.interview_problems enable row level security;

create policy "own rows" on public.interview_problems
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger set_updated_at before update on public.interview_problems
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- ideas
-- ---------------------------------------------------------------------------
create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  title text not null,
  why_interesting text,
  research_later boolean not null default false,
  status text not null default 'parked' check (status in ('parked', 'researched', 'killed', 'doing')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ideas enable row level security;

create policy "own rows" on public.ideas
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger set_updated_at before update on public.ideas
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- skill_categories
-- ---------------------------------------------------------------------------
create table public.skill_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name text not null,
  sort int not null default 0,
  is_side_tree boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.skill_categories enable row level security;

create policy "own rows" on public.skill_categories
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger set_updated_at before update on public.skill_categories
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- skills
-- ---------------------------------------------------------------------------
create table public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  category_id uuid not null references public.skill_categories (id) on delete cascade,
  name text not null,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, category_id, name)
);

alter table public.skills enable row level security;

create policy "own rows" on public.skills
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger set_updated_at before update on public.skills
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- skill_milestones
-- ---------------------------------------------------------------------------
create table public.skill_milestones (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  skill_id uuid not null references public.skills (id) on delete cascade,
  title text not null,
  done boolean not null default false,
  done_at timestamptz,
  proof text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, skill_id, title)
);

alter table public.skill_milestones enable row level security;

create policy "own rows" on public.skill_milestones
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger set_updated_at before update on public.skill_milestones
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- skill_resources
-- ---------------------------------------------------------------------------
create table public.skill_resources (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  skill_id uuid not null references public.skills (id) on delete cascade,
  kind text not null check (kind in ('book', 'podcast', 'doc', 'course', 'person', 'project')),
  title text not null,
  url text,
  how_to_use text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, skill_id, title)
);

alter table public.skill_resources enable row level security;

create policy "own rows" on public.skill_resources
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger set_updated_at before update on public.skill_resources
  for each row execute function public.set_updated_at();
