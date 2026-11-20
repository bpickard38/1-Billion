-- Exercise tab: log each set (reps / seconds / minutes) and let the AI
-- progress the plan after a workout.

-- One row per exercise per day. results is a JSON array, one number per
-- set in order, with null for a set left empty: [20, 18, null].
create table public.workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  date date not null,
  exercise text not null check (char_length(exercise) between 1 and 120),
  unit text not null check (unit in ('reps', 'seconds', 'minutes')),
  results jsonb not null default '[]'::jsonb check (jsonb_typeof(results) = 'array'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date, exercise)
);

alter table public.workout_logs enable row level security;

create policy "own rows" on public.workout_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger set_updated_at before update on public.workout_logs
  for each row execute function public.set_updated_at();

create index workout_logs_user_exercise_idx on public.workout_logs (user_id, exercise, date desc);

-- What the AI changed after the last finished workout, and when.
alter table public.workout_plans
  add column progress_note text,
  add column progressed_on date;
