-- Idempotent seed for Brayden's account only. Multi-user signups from
-- /signup start with an empty profile (created by the on_auth_user_created
-- trigger in 0001_core.sql) — this file never touches other users' data.
-- Safe to re-run: every insert is keyed on a natural unique key and either
-- no-ops (ON CONFLICT DO NOTHING) or updates in place (ON CONFLICT DO UPDATE)
-- when the row's id needs to be reused as a parent/foreign key below.
--
-- Source: "1 Billion dollars.docx" (Parts II-IV, V, VII, VIII, XIII, XIV, XVI).
-- Brayden: review every title/target/date below and edit before this runs.

do $$
declare
  v_user_id uuid;

  v_goal_dream uuid;
  v_goal_month uuid;
  v_goal_week uuid;

  v_cat_sales uuid;
  v_cat_product uuid;
  v_cat_tech uuid;
  v_cat_ai uuid;
  v_cat_finance uuid;
  v_cat_leadership uuid;
  v_cat_comm uuid;
  v_cat_racing uuid;
begin
  select id into v_user_id from auth.users where email = 'bpickard38@gmail.com';

  if v_user_id is null then
    raise notice 'Seed skipped: no auth.users row for bpickard38@gmail.com yet. Sign up first, then re-run this file.';
    return;
  end if;

  -- ---------------------------------------------------------------------
  -- profile (upsert: a user created before the on_auth_user_created
  -- trigger existed won't have a row yet)
  -- ---------------------------------------------------------------------
  insert into public.profiles (id, north_star)
    values (v_user_id, 'Build a billion-dollar company')
    on conflict (id) do update set north_star = excluded.north_star;

  -- ---------------------------------------------------------------------
  -- goal chain (Part 0 decisions + Part II/III Q1 targets) — collapsed to
  -- Dream -> Month -> Week -> Today (2026-09-08 simplification pass; the
  -- 10yr/3yr/1yr/Quarter rows this chain used to pass through are now just
  -- prose context, not tracked goal rows)
  -- ---------------------------------------------------------------------
  insert into public.goals (user_id, level, parent_id, title, status)
    values (v_user_id, 'dream', null, 'Build a billion-dollar company', 'active')
    on conflict (user_id, level, title) do update set status = excluded.status
    returning id into v_goal_dream;

  insert into public.goals (user_id, level, parent_id, title, description, target_value, target_unit, starts_on, ends_on, status)
    values (
      v_user_id, 'month', v_goal_dream, '20 interviews this month',
      'Validating one painful vertical workflow. Q1: 30-40 healthcare interviews + 15-20 energy interviews.',
      20, 'interviews', '2026-09-01', '2026-09-30', 'active'
    )
    on conflict (user_id, level, title) do update set description = excluded.description
    returning id into v_goal_month;

  insert into public.goals (user_id, level, parent_id, title, target_value, target_unit, starts_on, ends_on, status)
    values (
      v_user_id, 'week', v_goal_month, '5 interviews this week',
      5, 'interviews', '2026-08-31', '2026-09-06', 'active'
    )
    on conflict (user_id, level, title) do update set parent_id = excluded.parent_id
    returning id into v_goal_week;

  -- ---------------------------------------------------------------------
  -- habits (Part IX)
  -- ---------------------------------------------------------------------
  insert into public.habits (user_id, name, days_of_week, sort)
  values
    (v_user_id, 'Spiritual study', '{1,2,3,4,5,6,7}', 1),
    (v_user_id, 'Workout', '{1,2,3,4,5,6,7}', 2),
    (v_user_id, 'Deep work', '{1,2,3,4,5,6}', 3),
    (v_user_id, 'Customer/outbound work', '{1,2,3,4,5,6,7}', 4),
    (v_user_id, 'Technical learning', '{1,2,3,4,5,6,7}', 5),
    (v_user_id, 'Read', '{1,2,3,4,5,6,7}', 6),
    (v_user_id, 'Uncomfortable rep', '{1,2,3,4,5}', 7),
    (v_user_id, 'Daily review', '{1,2,3,4,5,6,7}', 8)
  on conflict (user_id, name) do nothing;

  -- ---------------------------------------------------------------------
  -- weekday schedule templates (Part VII weekly OS + Part VIII daily skeleton)
  -- weekday: 1=Mon ... 7=Sun
  -- ---------------------------------------------------------------------
  insert into public.schedule_templates (user_id, weekday, start_time, end_time, title, category, sort)
  values
    -- Monday - CEO / Sales
    (v_user_id, 1, '06:30', '07:00', 'Spiritual study / prayer / reflection', 'Faith/Family', 1),
    (v_user_id, 1, '07:00', '08:00', 'Exercise + breakfast', 'Health', 2),
    (v_user_id, 1, '08:00', '12:00', 'Hardest cognitive work (class/coding/studying)', 'School', 3),
    (v_user_id, 1, '12:00', '13:00', 'Lunch / walk', 'Rest', 4),
    (v_user_id, 1, '13:00', '16:00', 'Classes / coursework', 'School', 5),
    (v_user_id, 1, '16:00', '18:00', 'Outbound: calls, emails, LinkedIn', 'Startup-Customers', 6),
    (v_user_id, 1, '18:00', '19:00', 'Dinner / family', 'Faith/Family', 7),
    (v_user_id, 1, '19:00', '21:00', 'Review metrics: biggest bottleneck, this week''s priority + customer calls', 'Startup-Strategy', 8),
    (v_user_id, 1, '21:00', '21:30', 'Read', 'Learning', 9),
    (v_user_id, 1, '21:30', '21:45', 'Daily review', 'Startup-Strategy', 10),
    (v_user_id, 1, '21:45', '22:30', 'Wind down', 'Rest', 11),

    -- Tuesday - Customers + Product
    (v_user_id, 2, '06:30', '07:00', 'Spiritual study / prayer / reflection', 'Faith/Family', 1),
    (v_user_id, 2, '07:00', '08:00', 'Exercise + breakfast', 'Health', 2),
    (v_user_id, 2, '08:00', '12:00', 'Hardest cognitive work (class/coding/studying)', 'School', 3),
    (v_user_id, 2, '12:00', '13:00', 'Lunch / walk', 'Rest', 4),
    (v_user_id, 2, '13:00', '16:00', 'Classes / coursework', 'School', 5),
    (v_user_id, 2, '16:00', '18:00', 'Interview customers, map workflows, watch them work', 'Startup-Customers', 6),
    (v_user_id, 2, '18:00', '19:00', 'Dinner / family', 'Faith/Family', 7),
    (v_user_id, 2, '19:00', '21:00', 'Document problems, decide product changes', 'Startup-Build', 8),
    (v_user_id, 2, '21:00', '21:30', 'Read', 'Learning', 9),
    (v_user_id, 2, '21:30', '21:45', 'Daily review', 'Startup-Strategy', 10),
    (v_user_id, 2, '21:45', '22:30', 'Wind down', 'Rest', 11),

    -- Wednesday - Build
    (v_user_id, 3, '06:30', '07:00', 'Spiritual study / prayer / reflection', 'Faith/Family', 1),
    (v_user_id, 3, '07:00', '08:00', 'Exercise + breakfast', 'Health', 2),
    (v_user_id, 3, '08:00', '12:00', 'Hardest cognitive work (class/coding/studying)', 'School', 3),
    (v_user_id, 3, '12:00', '13:00', 'Lunch / walk', 'Rest', 4),
    (v_user_id, 3, '13:00', '16:00', 'Classes / coursework', 'School', 5),
    (v_user_id, 3, '16:00', '18:00', 'Prototype / build', 'Startup-Build', 6),
    (v_user_id, 3, '18:00', '19:00', 'Dinner / family', 'Faith/Family', 7),
    (v_user_id, 3, '19:00', '21:00', 'Build. Test. Deploy.', 'Startup-Build', 8),
    (v_user_id, 3, '21:00', '21:30', 'Read', 'Learning', 9),
    (v_user_id, 3, '21:30', '21:45', 'Daily review', 'Startup-Strategy', 10),
    (v_user_id, 3, '21:45', '22:30', 'Wind down', 'Rest', 11),

    -- Thursday - Sell
    (v_user_id, 4, '06:30', '07:00', 'Spiritual study / prayer / reflection', 'Faith/Family', 1),
    (v_user_id, 4, '07:00', '08:00', 'Exercise + breakfast', 'Health', 2),
    (v_user_id, 4, '08:00', '12:00', 'Hardest cognitive work (class/coding/studying)', 'School', 3),
    (v_user_id, 4, '12:00', '13:00', 'Lunch / walk', 'Rest', 4),
    (v_user_id, 4, '13:00', '16:00', 'Classes / coursework', 'School', 5),
    (v_user_id, 4, '16:00', '18:00', 'Outbound, demos', 'Startup-Customers', 6),
    (v_user_id, 4, '18:00', '19:00', 'Dinner / family', 'Faith/Family', 7),
    (v_user_id, 4, '19:00', '21:00', 'Follow-up, proposals, pilot conversations', 'Startup-Customers', 8),
    (v_user_id, 4, '21:00', '21:30', 'Read', 'Learning', 9),
    (v_user_id, 4, '21:30', '21:45', 'Daily review', 'Startup-Strategy', 10),
    (v_user_id, 4, '21:45', '22:30', 'Wind down', 'Rest', 11),

    -- Friday - Strategy
    (v_user_id, 5, '06:30', '07:00', 'Spiritual study / prayer / reflection', 'Faith/Family', 1),
    (v_user_id, 5, '07:00', '08:00', 'Exercise + breakfast', 'Health', 2),
    (v_user_id, 5, '08:00', '12:00', 'Hardest cognitive work (class/coding/studying)', 'School', 3),
    (v_user_id, 5, '12:00', '13:00', 'Lunch / walk', 'Rest', 4),
    (v_user_id, 5, '13:00', '16:00', 'Classes / coursework', 'School', 5),
    (v_user_id, 5, '16:00', '18:00', 'Review pipeline: customers, usage, revenue, product, learning', 'Startup-Strategy', 6),
    (v_user_id, 5, '18:00', '19:00', 'Dinner / family', 'Faith/Family', 7),
    (v_user_id, 5, '19:00', '21:00', 'Write weekly CEO memo: wins, failures, customer insight, metrics, bottleneck, next week''s top 3', 'Startup-Strategy', 8),
    (v_user_id, 5, '21:00', '21:30', 'Read', 'Learning', 9),
    (v_user_id, 5, '21:30', '21:45', 'Daily review', 'Startup-Strategy', 10),
    (v_user_id, 5, '21:45', '22:30', 'Wind down', 'Rest', 11),

    -- Saturday - Deep Development Day
    (v_user_id, 6, '06:30', '07:00', 'Spiritual study / prayer / reflection', 'Faith/Family', 1),
    (v_user_id, 6, '07:00', '08:00', 'Exercise + breakfast', 'Health', 2),
    (v_user_id, 6, '08:00', '12:00', 'Deep development: technical learning, AI, coding', 'Learning', 3),
    (v_user_id, 6, '12:00', '13:00', 'Lunch', 'Rest', 4),
    (v_user_id, 6, '13:00', '17:00', 'Deep development: product work, strategy, reading', 'Startup-Build', 5),
    (v_user_id, 6, '17:00', '18:00', 'Racing/engineering curiosity', 'Racing', 6),
    (v_user_id, 6, '18:00', '19:00', 'Dinner / family', 'Faith/Family', 7),
    (v_user_id, 6, '19:00', '21:00', 'Free time / wind down', 'Rest', 8),
    (v_user_id, 6, '21:00', '21:30', 'Read', 'Learning', 9),
    (v_user_id, 6, '21:30', '21:45', 'Daily review', 'Startup-Strategy', 10),
    (v_user_id, 6, '21:45', '22:30', 'Wind down', 'Rest', 11),

    -- Sunday - protected
    (v_user_id, 7, '06:30', '09:00', 'Worship, spiritual study, reflection', 'Faith/Family', 1),
    (v_user_id, 7, '09:00', '12:00', 'Family / relationships', 'Faith/Family', 2),
    (v_user_id, 7, '12:00', '13:00', 'Lunch', 'Rest', 3),
    (v_user_id, 7, '13:00', '18:00', 'Recovery / relationships / reflection (no startup work)', 'Rest', 4),
    (v_user_id, 7, '18:00', '19:00', 'Dinner / family', 'Faith/Family', 5),
    (v_user_id, 7, '19:00', '21:30', 'Free time / relationships', 'Rest', 6),
    (v_user_id, 7, '21:30', '22:30', 'Wind down', 'Rest', 7)
  on conflict (user_id, weekday, title) do nothing;

  -- ---------------------------------------------------------------------
  -- skill tree (Part IV skills, Part V curriculum, Part XIV side curriculum,
  -- Part XVI scoreboard)
  -- ---------------------------------------------------------------------
  insert into public.skill_categories (user_id, name, sort, is_side_tree) values
    (v_user_id, 'Sales', 1, false)
    on conflict (user_id, name) do update set sort = excluded.sort returning id into v_cat_sales;
  insert into public.skill_categories (user_id, name, sort, is_side_tree) values
    (v_user_id, 'Product', 2, false)
    on conflict (user_id, name) do update set sort = excluded.sort returning id into v_cat_product;
  insert into public.skill_categories (user_id, name, sort, is_side_tree) values
    (v_user_id, 'Technology', 3, false)
    on conflict (user_id, name) do update set sort = excluded.sort returning id into v_cat_tech;
  insert into public.skill_categories (user_id, name, sort, is_side_tree) values
    (v_user_id, 'AI Engineering', 4, false)
    on conflict (user_id, name) do update set sort = excluded.sort returning id into v_cat_ai;
  insert into public.skill_categories (user_id, name, sort, is_side_tree) values
    (v_user_id, 'Finance', 5, false)
    on conflict (user_id, name) do update set sort = excluded.sort returning id into v_cat_finance;
  insert into public.skill_categories (user_id, name, sort, is_side_tree) values
    (v_user_id, 'Leadership', 6, false)
    on conflict (user_id, name) do update set sort = excluded.sort returning id into v_cat_leadership;
  insert into public.skill_categories (user_id, name, sort, is_side_tree) values
    (v_user_id, 'Communication', 7, false)
    on conflict (user_id, name) do update set sort = excluded.sort returning id into v_cat_comm;
  insert into public.skill_categories (user_id, name, sort, is_side_tree) values
    (v_user_id, 'Racing Engineering', 8, true)
    on conflict (user_id, name) do update set sort = excluded.sort returning id into v_cat_racing;

  -- Flat skill list per category (2026-09-08 simplification pass dropped the
  -- separate milestones + resources sub-model in favor of one manual status
  -- per skill — see skills.status, default 'not_started').
  insert into public.skills (user_id, category_id, name, sort) values
    (v_user_id, v_cat_sales, 'Prospecting', 1),
    (v_user_id, v_cat_sales, 'Discovery', 2),
    (v_user_id, v_cat_sales, 'Selling & Negotiation', 3),
    (v_user_id, v_cat_sales, 'Account Expansion', 4),
    (v_user_id, v_cat_product, 'Discovery & Strategy', 1),
    (v_user_id, v_cat_product, 'Building & Prioritization', 2),
    (v_user_id, v_cat_tech, 'Programming Fundamentals', 1),
    (v_user_id, v_cat_tech, 'Web Architecture & SQL', 2),
    (v_user_id, v_cat_tech, 'Enterprise Engineering', 3),
    (v_user_id, v_cat_ai, 'LLM Applications', 1),
    (v_user_id, v_cat_ai, 'Reliability & Evals', 2),
    (v_user_id, v_cat_ai, 'Enterprise AI', 3),
    (v_user_id, v_cat_finance, 'Accounting & SaaS Metrics', 1),
    (v_user_id, v_cat_finance, 'Startup Finance & Cap Tables', 2),
    (v_user_id, v_cat_leadership, 'People Management', 1),
    (v_user_id, v_cat_leadership, 'Organizational Design', 2),
    (v_user_id, v_cat_comm, 'Writing', 1),
    (v_user_id, v_cat_comm, 'Speaking', 2),
    (v_user_id, v_cat_racing, 'Vehicle Fundamentals (Years 1-2)', 1),
    (v_user_id, v_cat_racing, 'Advanced Vehicle Dynamics (Years 3-5)', 2)
  on conflict (user_id, category_id, name) do update set sort = excluded.sort;

end $$;
