-- Idempotent seed for Brayden's account only: the Morning system.
-- Safe to re-run: skips if a system named "Morning" already exists.

do $$
declare
  v_user_id uuid;
  v_system_id uuid;
  v_steps text[] := array[
    'Wake up', 'Drink water', 'Meditate', 'Stretch', 'Work out',
    'Shower', 'Eat breakfast', 'Read the scriptures', 'Read a book'
  ];
begin
  select id into v_user_id from auth.users where email = 'bpickard38@gmail.com';
  if v_user_id is null then
    raise notice 'Seed skipped: no auth.users row for bpickard38@gmail.com yet.';
    return;
  end if;

  insert into public.profiles (id) values (v_user_id) on conflict (id) do nothing;

  insert into public.systems (user_id, name, sort, time_of_day)
    values (v_user_id, 'Morning', 1, 'morning')
    on conflict (user_id, name) do nothing
    returning id into v_system_id;

  if v_system_id is null then
    raise notice 'Morning system already exists; leaving it alone.';
    return;
  end if;

  insert into public.system_steps (user_id, system_id, title, sort)
    select v_user_id, v_system_id, t, i
    from unnest(v_steps) with ordinality as s(t, i);
end $$;
