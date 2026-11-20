-- Exercise tab (AI workout plan) and Chat tab (ChatGPT conversation).

-- One workout plan per user: the inputs and the AI's latest plan.
create table public.workout_plans (
  user_id uuid primary key references auth.users (id) on delete cascade default auth.uid(),
  goals text not null default '' check (char_length(goals) <= 2000),
  schedule text not null default '' check (char_length(schedule) <= 1000),
  notes text not null default '' check (char_length(notes) <= 1000),
  plan jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.workout_plans enable row level security;

create policy "own row" on public.workout_plans
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger set_updated_at before update on public.workout_plans
  for each row execute function public.set_updated_at();

-- One running chat thread per user.
create table public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  role text not null check (role in ('user', 'assistant')),
  content text not null check (char_length(content) between 1 and 20000),
  created_at timestamptz not null default now()
);

alter table public.chat_messages enable row level security;

create policy "own rows" on public.chat_messages
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create index chat_messages_user_created_idx on public.chat_messages (user_id, created_at);

-- Chat sends a request per message, so 20 seconds between AI calls is too
-- slow. 5 seconds still stops a stuck button from looping.
create or replace function public.claim_ai() returns boolean
language plpgsql security invoker set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  update public.profiles set last_ai_at = now()
    where id = auth.uid() and (last_ai_at is null or last_ai_at < now() - interval '5 seconds');
  return found;
end $$;
