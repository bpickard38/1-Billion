-- ---------------------------------------------------------------------------
-- seed_demo(): fills the calling user's account with sample data for the
-- "Try the demo" button. Each visitor signs in anonymously and gets their
-- own private copy (RLS keeps them apart); the cron tick deletes anonymous
-- users after 24h, and their rows go with them via on delete cascade.
--
-- Everything is dated relative to the caller's "today", so the demo never
-- goes stale. Runs as the caller (security invoker), refuses non-anonymous
-- users so it can never write into a real account, and is a no-op on a
-- second call.
-- ---------------------------------------------------------------------------
create function public.seed_demo() returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  tz text;
  d date;   -- caller's local today
  ws date;  -- Monday of the current week
  v_dream uuid;
  v_month uuid;
begin
  if uid is null then raise exception 'Sign in first.'; end if;
  if coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) is not true then
    raise exception 'Demo data is only for demo accounts.';
  end if;
  if exists (select 1 from goals where user_id = uid) then return; end if;

  select timezone into tz from profiles where id = uid;
  tz := coalesce(tz, 'America/Denver');
  d := (now() at time zone tz)::date;
  ws := date_trunc('week', d)::date;

  update profiles set north_star = 'Launch a profitable software company before graduating' where id = uid;

  -- goal chain: dream -> month -> week
  insert into goals (user_id, level, title, status)
    values (uid, 'dream', 'Launch a profitable software company before graduating', 'active')
    returning id into v_dream;
  insert into goals (user_id, level, parent_id, title, target_value, target_unit, current_value, starts_on, ends_on, status)
    values (uid, 'month', v_dream, 'Get 10 paying beta users', 10, 'users', 6,
            date_trunc('month', d)::date, (date_trunc('month', d) + interval '1 month - 1 day')::date, 'active')
    returning id into v_month;
  insert into goals (user_id, level, parent_id, title, starts_on, ends_on, status) values
    (uid, 'month', v_dream, 'Finish CS 260 project with an A',
     date_trunc('month', d)::date, (date_trunc('month', d) + interval '1 month - 1 day')::date, 'active'),
    (uid, 'week', v_month, 'Run 5 customer interviews', ws, ws + 6, 'active'),
    (uid, 'week', v_month, 'Ship onboarding flow v2', ws, ws + 6, 'active');

  -- to-dos: the previous 13 days (covers last week and this week so far), then today
  insert into todos (user_id, date, title, sort, done)
  select uid, d - g.n, t.title, (t.ord - 1)::int, (t.ord + g.n) % 5 <> 0
  from generate_series(1, 13) as g(n)
  cross join unnest(array['Customer interview', 'Fix signup bug', 'Problem set', 'Gym', 'Write landing page copy'])
    with ordinality as t(title, ord)
  where t.ord <= 3 + g.n % 3;

  insert into todos (user_id, date, title, sort, done) values
    (uid, d, 'Ship onboarding flow v2 to beta users', 0, false),
    (uid, d, 'Customer interview with Sarah (3pm)', 1, false),
    (uid, d, 'CS 260 lab 6', 2, true),
    (uid, d, 'Email 5 beta users for feedback', 3, true),
    (uid, d, 'Gym: legs', 4, false);

  -- last week's closed review, scored the same way as the app (done / created)
  insert into weekly_reviews (user_id, week_start, score, closed_at, biggest_issue, answers, breakdown)
  select uid, ws - 7,
    round(100.0 * count(*) filter (where done) / nullif(count(*), 0))::int,
    now() - interval '1 day',
    'Interviews slipped to the weekend',
    '{}'::jsonb,
    (select jsonb_agg(jsonb_build_object('date', x.date, 'label', to_char(x.date, 'Dy'), 'pct', x.pct) order by x.date)
     from (select date, round(100.0 * count(*) filter (where done) / count(*))::int as pct
           from todos where user_id = uid and date between ws - 7 and ws - 1 group by date) x)
  from todos
  where user_id = uid and date between ws - 7 and ws - 1;

  -- schedule: yesterday, today and tomorrow (local wall-clock times)
  insert into schedule_blocks (user_id, date, start_at, end_at, title, category, source, done)
  select uid, d + v.day_offset,
    ((d + v.day_offset) + v.s::time) at time zone tz,
    ((d + v.day_offset) + v.e::time) at time zone tz,
    v.title, v.category, 'manual',
    ((d + v.day_offset) + v.e::time) at time zone tz < now()
  from (values
    (-1, '07:00', '08:00', 'Gym + breakfast', 'Health'),
    (-1, '09:00', '12:00', 'Deep work: pricing page', 'Startup-Build'),
    (-1, '13:00', '15:00', 'CS 260 problem set', 'School'),
    (-1, '16:00', '17:30', 'Outbound: 20 cold emails', 'Startup-Customers'),
    (-1, '18:00', '19:00', 'Dinner with family', 'Faith/Family'),
    (0, '07:00', '08:00', 'Gym + breakfast', 'Health'),
    (0, '08:00', '09:30', 'CS 260 lecture', 'School'),
    (0, '09:30', '12:00', 'Deep work: onboarding flow v2', 'Startup-Build'),
    (0, '12:00', '13:00', 'Lunch walk', 'Rest'),
    (0, '13:00', '14:30', 'CS 260 lab 6', 'School'),
    (0, '15:00', '15:45', 'Customer interview: Sarah', 'Startup-Customers'),
    (0, '16:00', '17:00', 'Email beta users', 'Startup-Customers'),
    (0, '18:00', '19:00', 'Dinner with family', 'Faith/Family'),
    (0, '19:30', '20:30', 'Read: The Mom Test', 'Learning'),
    (0, '21:30', '21:45', 'Daily review', 'Startup-Strategy'),
    (1, '08:00', '09:30', 'CS 260 lecture', 'School'),
    (1, '10:00', '12:00', 'Deep work: onboarding QA', 'Startup-Build'),
    (1, '14:00', '15:00', 'Customer interview: Marcus', 'Startup-Customers'),
    (1, '17:00', '18:00', 'Gym', 'Health')
  ) as v(day_offset, s, e, title, category);

  -- skill tree
  with c as (
    insert into skill_categories (user_id, name, sort)
    values (uid, 'Engineering', 0), (uid, 'Sales', 1), (uid, 'Product', 2)
    returning id, name
  )
  insert into skills (user_id, category_id, name, status, sort)
  select uid, c.id, s.name, s.status, s.sort
  from c join (values
    ('Engineering', 'TypeScript', 'proven', 0),
    ('Engineering', 'Postgres + RLS', 'in_progress', 1),
    ('Engineering', 'System design', 'not_started', 2),
    ('Sales', 'Customer interviews', 'in_progress', 0),
    ('Sales', 'Cold outreach', 'in_progress', 1),
    ('Sales', 'Closing pilots', 'not_started', 2),
    ('Product', 'User research synthesis', 'in_progress', 0),
    ('Product', 'Pricing', 'not_started', 1)
  ) as s(category, name, status, sort) on s.category = c.name;
end;
$$;

revoke all on function public.seed_demo() from public, anon;
grant execute on function public.seed_demo() to authenticated;
