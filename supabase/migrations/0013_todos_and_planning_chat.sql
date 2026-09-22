-- Habits -> to-do list, and a conversational daily planner (2026-09-21
-- decision): the "#1 priority today" field is gone too — the top item of
-- the day's to-do list (lowest `sort`) is the priority now.

-- ---------------------------------------------------------------------------
-- habits: drop entirely (habit_logs first, it references habits)
-- ---------------------------------------------------------------------------
drop table if exists public.habit_logs;
drop table if exists public.habits;

-- ---------------------------------------------------------------------------
-- daily_entries: drop the priority fields, replaced by `todos`
-- ---------------------------------------------------------------------------
alter table public.daily_entries
  drop column if exists priority_text,
  drop column if exists priority_goal_id,
  drop column if exists tomorrow_priority;

-- ---------------------------------------------------------------------------
-- todos: one flat list per day. Position (`sort`) is the priority order —
-- item 1 (lowest sort) is today's #1.
-- ---------------------------------------------------------------------------
create table public.todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  date date not null,
  title text not null,
  done boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.todos enable row level security;

create policy "own rows" on public.todos
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger set_updated_at before update on public.todos
  for each row execute function public.set_updated_at();

create index todos_user_date_idx on public.todos (user_id, date);

-- ---------------------------------------------------------------------------
-- planning_chat_messages: the "figure out the plan" conversation for a day.
-- `payload` carries the assistant's structured proposal (todos + blocks)
-- once it has one ready to confirm; null on every user message and on
-- assistant messages that are still asking questions.
-- ---------------------------------------------------------------------------
create table public.planning_chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  date date not null,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.planning_chat_messages enable row level security;

create policy "own rows" on public.planning_chat_messages
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index planning_chat_messages_user_date_idx on public.planning_chat_messages (user_id, date, created_at);

-- ---------------------------------------------------------------------------
-- notification_log: "today_priority" -> "plan_day" (nudges you to run the
-- planning chat instead of nudging you to set a priority text field), and
-- "uncomfortable_rep" is gone with the habit it tracked.
-- ---------------------------------------------------------------------------
alter table public.notification_log drop constraint notification_log_kind_check;
alter table public.notification_log
  add constraint notification_log_kind_check
    check (kind in ('plan_day', 'daily_review', 'weekly_review', 'followup_reminder'));
