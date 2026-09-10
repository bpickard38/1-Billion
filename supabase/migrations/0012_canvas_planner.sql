create table public.canvas_connections (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  token_ciphertext text not null,
  courses jsonb not null default '[]',
  selected_course_ids text[] not null default '{}',
  last_synced_at timestamptz
);
alter table public.canvas_connections enable row level security;
create policy "own connection" on public.canvas_connections for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.canvas_assignments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  external_id text not null,
  course_id text not null,
  course_name text not null,
  title text not null,
  description text not null default '',
  due_at timestamptz,
  url text not null,
  submitted boolean not null default false,
  active boolean not null default true,
  estimated_minutes integer check (estimated_minutes between 5 and 1200),
  estimate_note text,
  estimate_source text check (estimate_source in ('ai','user')),
  unique(user_id,course_id,external_id)
);
alter table public.canvas_assignments enable row level security;
create policy "own assignments" on public.canvas_assignments for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.planning_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  preferences jsonb not null default '{"start":"08:00","end":"20:00","breakMinutes":10,"sessionMinutes":50}',
  last_ai_at timestamptz
);
alter table public.planning_preferences enable row level security;
create policy "own preferences" on public.planning_preferences for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.planning_drafts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  blocks jsonb not null,
  status text not null default 'draft' check(status in ('draft','confirmed','undone')),
  created_at timestamptz not null default now()
);
alter table public.planning_drafts enable row level security;
create policy "own plans" on public.planning_drafts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
alter table public.schedule_blocks add column planning_draft_id uuid references public.planning_drafts(id) on delete set null;
alter table public.schedule_blocks add column assignment_id uuid references public.canvas_assignments(id) on delete set null;

-- Serializes confirmations with all schedule writes, and makes a retried approval idempotent.
create function public.confirm_planning_draft(draft_id uuid) returns setof public.schedule_blocks
language plpgsql security invoker set search_path = public as $$
declare draft public.planning_drafts; b jsonb; d date; zone text;
begin
  if auth.uid() is null then raise exception 'Sign in first.'; end if;
  lock table public.schedule_blocks in share row exclusive mode;
  select * into draft from public.planning_drafts where id = draft_id and user_id = auth.uid() for update;
  if not found then raise exception 'Plan not found.'; end if;
  if draft.status = 'undone' then raise exception 'This plan was undone. Create a new preview.'; end if;
  if draft.status = 'confirmed' then
    return query select * from public.schedule_blocks where planning_draft_id = draft_id and user_id = auth.uid();
    return;
  end if;
  if draft.created_at < now() - interval '1 hour' then raise exception 'This preview expired. Create a new one.'; end if;
  if jsonb_typeof(draft.blocks) <> 'array' or jsonb_array_length(draft.blocks) not between 1 and 100 then raise exception 'Invalid plan.'; end if;
  -- Preserve template commitments on future days. Today's existing materializer
  -- skips days with any blocks, so adding a study session must not hide templates.
  select coalesce(timezone,'America/Denver') into zone from public.profiles where id = auth.uid();
  zone := coalesce(zone,'America/Denver');
  for d in select distinct (value->>'date')::date from jsonb_array_elements(draft.blocks) loop
    if not exists(select 1 from public.schedule_blocks where user_id = auth.uid() and date = d) then
      insert into public.schedule_blocks(user_id,date,start_at,end_at,title,category,source)
      select auth.uid(),d,(d+t.start_time) at time zone zone,(d+t.end_time) at time zone zone,t.title,t.category,'template'
      from public.schedule_templates t where t.user_id = auth.uid() and t.weekday = extract(isodow from d);
    end if;
  end loop;
  for b in select value from jsonb_array_elements(draft.blocks) loop
    if (b->>'start_at')::timestamptz < now() or (b->>'end_at')::timestamptz <= (b->>'start_at')::timestamptz then raise exception 'A proposed time has passed. Create a new preview.'; end if;
    if exists(select 1 from public.schedule_blocks s where s.user_id = auth.uid() and s.start_at < (b->>'end_at')::timestamptz and s.end_at > (b->>'start_at')::timestamptz) then raise exception 'Your calendar changed. Create a new preview to avoid a conflict.'; end if;
    if b->>'assignment_id' is not null and not exists(select 1 from public.canvas_assignments a where a.id = (b->>'assignment_id')::uuid and a.user_id = auth.uid() and a.active and not a.submitted and (a.due_at is null or a.due_at >= (b->>'end_at')::timestamptz)) then raise exception 'An assignment changed or its deadline passed. Refresh assignments and preview again.'; end if;
    -- Each insert is checked by subsequent iterations; any failure rolls the whole batch back.
    insert into public.schedule_blocks(user_id,date,start_at,end_at,title,category,source,planning_draft_id,assignment_id)
    values(auth.uid(),(b->>'date')::date,(b->>'start_at')::timestamptz,(b->>'end_at')::timestamptz,b->>'title',b->>'category','manual',draft_id,(b->>'assignment_id')::uuid);
  end loop;
  update public.planning_drafts set status = 'confirmed' where id = draft_id;
  return query select * from public.schedule_blocks where planning_draft_id = draft_id and user_id = auth.uid();
end $$;
revoke all on function public.confirm_planning_draft(uuid) from public, anon;
grant execute on function public.confirm_planning_draft(uuid) to authenticated;

-- A shared, per-account cooldown prevents repeated clicks from making parallel paid calls.
create function public.claim_planner_ai() returns boolean
language plpgsql security invoker set search_path = public as $$
begin
  if auth.uid() is null then return false; end if;
  insert into public.planning_preferences(user_id) values(auth.uid()) on conflict do nothing;
  update public.planning_preferences set last_ai_at = now() where user_id = auth.uid() and (last_ai_at is null or last_ai_at < now() - interval '30 seconds');
  return found;
end $$;
revoke all on function public.claim_planner_ai() from public, anon;
grant execute on function public.claim_planner_ai() to authenticated;
