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
  v_goal_10yr uuid;
  v_goal_3yr uuid;
  v_goal_1yr uuid;
  v_goal_quarter uuid;
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

  v_sk_prospecting uuid;
  v_sk_discovery uuid;
  v_sk_selling uuid;
  v_sk_expansion uuid;

  v_sk_prod_discovery uuid;
  v_sk_prod_building uuid;

  v_sk_tech_fundamentals uuid;
  v_sk_tech_webarch uuid;
  v_sk_tech_enterprise uuid;

  v_sk_ai_llm uuid;
  v_sk_ai_reliability uuid;
  v_sk_ai_enterprise uuid;

  v_sk_fin_accounting uuid;
  v_sk_fin_startup uuid;

  v_sk_lead_people uuid;
  v_sk_lead_org uuid;

  v_sk_comm_writing uuid;
  v_sk_comm_speaking uuid;

  v_sk_racing_fund uuid;
  v_sk_racing_adv uuid;
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
  -- goal chain (Part 0 decisions + Part II/III Q1 targets)
  -- ---------------------------------------------------------------------
  insert into public.goals (user_id, level, parent_id, title, status)
    values (v_user_id, 'dream', null, 'Build a billion-dollar company', 'active')
    on conflict (user_id, level, title) do update set status = excluded.status
    returning id into v_goal_dream;

  insert into public.goals (user_id, level, parent_id, title, status)
    values (v_user_id, '10yr', v_goal_dream, 'Significant equity in a $1B+ business', 'active')
    on conflict (user_id, level, title) do update set parent_id = excluded.parent_id
    returning id into v_goal_10yr;

  insert into public.goals (user_id, level, parent_id, title, status)
    values (v_user_id, '3yr', v_goal_10yr, 'A meaningful B2B AI company', 'active')
    on conflict (user_id, level, title) do update set parent_id = excluded.parent_id
    returning id into v_goal_3yr;

  insert into public.goals (user_id, level, parent_id, title, status)
    values (v_user_id, '1yr', v_goal_3yr, '$10k+ MRR and 100 customer conversations', 'active')
    on conflict (user_id, level, title) do update set parent_id = excluded.parent_id
    returning id into v_goal_1yr;

  insert into public.goals (user_id, level, parent_id, title, description, starts_on, ends_on, status)
    values (
      v_user_id, 'quarter', v_goal_1yr,
      'Validate one painful vertical workflow',
      'Q1: 30-40 healthcare interviews + 15-20 energy interviews.',
      '2026-09-01', '2026-11-30', 'active'
    )
    on conflict (user_id, level, title) do update set description = excluded.description
    returning id into v_goal_quarter;

  insert into public.goals (user_id, level, parent_id, title, target_value, target_unit, starts_on, ends_on, status)
    values (
      v_user_id, 'month', v_goal_quarter, '20 interviews this month',
      20, 'interviews', '2026-09-01', '2026-09-30', 'active'
    )
    on conflict (user_id, level, title) do update set parent_id = excluded.parent_id
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
  -- metrics (Part XI weekly scorecard)
  -- ---------------------------------------------------------------------
  insert into public.metrics (user_id, name, unit, kind, weekly_target, sort, entry_mode)
  values
    (v_user_id, 'Outbound attempts', 'count', 'output', 100, 1, 'counter'),
    (v_user_id, 'Customer conversations', 'count', 'output', 5, 2, 'counter'),
    (v_user_id, 'Demos', 'count', 'output', 3, 3, 'counter'),
    (v_user_id, 'Product shipped', 'count', 'output', 1, 4, 'counter'),
    (v_user_id, 'Founder/expert conversations', 'count', 'output', 2, 5, 'counter'),
    (v_user_id, 'Revenue', 'dollars', 'output', null, 6, 'counter'),
    (v_user_id, 'Deep work hours', 'hours', 'input', 20, 7, 'daily_review'),
    (v_user_id, 'Technical learning hours', 'hours', 'input', 5, 8, 'daily_review'),
    (v_user_id, 'Reading hours', 'hours', 'input', 3, 9, 'daily_review'),
    (v_user_id, 'Exercise sessions', 'count', 'input', 4, 10, 'counter'),
    (v_user_id, 'Sleep hours', 'hours', 'input', 7.5, 11, 'daily_review')
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

  -- Sales
  insert into public.skills (user_id, category_id, name, sort) values (v_user_id, v_cat_sales, 'Prospecting', 1)
    on conflict (user_id, category_id, name) do update set sort = excluded.sort returning id into v_sk_prospecting;
  insert into public.skills (user_id, category_id, name, sort) values (v_user_id, v_cat_sales, 'Discovery', 2)
    on conflict (user_id, category_id, name) do update set sort = excluded.sort returning id into v_sk_discovery;
  insert into public.skills (user_id, category_id, name, sort) values (v_user_id, v_cat_sales, 'Selling & Negotiation', 3)
    on conflict (user_id, category_id, name) do update set sort = excluded.sort returning id into v_sk_selling;
  insert into public.skills (user_id, category_id, name, sort) values (v_user_id, v_cat_sales, 'Account Expansion', 4)
    on conflict (user_id, category_id, name) do update set sort = excluded.sort returning id into v_sk_expansion;

  insert into public.skill_milestones (user_id, skill_id, title) values
    (v_user_id, v_sk_prospecting, 'Complete 1,000+ total outbound reps'),
    (v_user_id, v_sk_prospecting, 'Make your first 100 cold outreach attempts'),
    (v_user_id, v_sk_discovery, 'Run discovery calls comfortably'),
    (v_user_id, v_sk_selling, 'Comfortable cold calling a CEO you''ve never met'),
    (v_user_id, v_sk_selling, 'Run demos'),
    (v_user_id, v_sk_selling, 'Negotiate pilots'),
    (v_user_id, v_sk_selling, 'Close contracts'),
    (v_user_id, v_sk_selling, 'Handle objections'),
    (v_user_id, v_sk_expansion, 'Ask for referrals')
  on conflict (user_id, skill_id, title) do nothing;

  insert into public.skill_resources (user_id, skill_id, kind, title, how_to_use) values
    (v_user_id, v_sk_selling, 'book', 'Founding Sales - Pete Kazanjy',
     'Month 2 of the 12-month curriculum; read alongside making your first 100 cold outreach attempts.')
  on conflict (user_id, skill_id, title) do nothing;

  -- Product
  insert into public.skills (user_id, category_id, name, sort) values (v_user_id, v_cat_product, 'Discovery & Strategy', 1)
    on conflict (user_id, category_id, name) do update set sort = excluded.sort returning id into v_sk_prod_discovery;
  insert into public.skills (user_id, category_id, name, sort) values (v_user_id, v_cat_product, 'Building & Prioritization', 2)
    on conflict (user_id, category_id, name) do update set sort = excluded.sort returning id into v_sk_prod_building;

  insert into public.skill_milestones (user_id, skill_id, title) values
    (v_user_id, v_sk_prod_discovery, 'Conduct proper customer interviews'),
    (v_user_id, v_sk_prod_discovery, 'Map workflows'),
    (v_user_id, v_sk_prod_discovery, 'Write a complete product thesis for one problem'),
    (v_user_id, v_sk_prod_building, 'Scope MVPs'),
    (v_user_id, v_sk_prod_building, 'Prioritize features'),
    (v_user_id, v_sk_prod_building, 'Measure usage and ROI'),
    (v_user_id, v_sk_prod_building, 'Understand retention and pricing')
  on conflict (user_id, skill_id, title) do nothing;

  insert into public.skill_resources (user_id, skill_id, kind, title, how_to_use) values
    (v_user_id, v_sk_prod_discovery, 'book', 'The Mom Test - Rob Fitzpatrick',
     'Month 1 of the 12-month curriculum; output is 20 customer interviews.'),
    (v_user_id, v_sk_prod_building, 'book', 'Inspired - Marty Cagan',
     'Month 3 of the 12-month curriculum; output is a complete product thesis for one problem.'),
    (v_user_id, v_sk_prod_building, 'book', 'Build - Tony Fadell',
     'Month 12 of the 12-month curriculum; then reread your journal from Month 1.')
  on conflict (user_id, skill_id, title) do nothing;

  -- Technology
  insert into public.skills (user_id, category_id, name, sort) values (v_user_id, v_cat_tech, 'Programming Fundamentals', 1)
    on conflict (user_id, category_id, name) do update set sort = excluded.sort returning id into v_sk_tech_fundamentals;
  insert into public.skills (user_id, category_id, name, sort) values (v_user_id, v_cat_tech, 'Web Architecture & SQL', 2)
    on conflict (user_id, category_id, name) do update set sort = excluded.sort returning id into v_sk_tech_webarch;
  insert into public.skills (user_id, category_id, name, sort) values (v_user_id, v_cat_tech, 'Enterprise Engineering', 3)
    on conflict (user_id, category_id, name) do update set sort = excluded.sort returning id into v_sk_tech_enterprise;

  insert into public.skill_milestones (user_id, skill_id, title) values
    (v_user_id, v_sk_tech_fundamentals, 'Deploy authentication without relying entirely on AI'),
    (v_user_id, v_sk_tech_webarch, 'Strong SQL fundamentals: SELECT, JOIN, GROUP BY, indexes, schema design'),
    (v_user_id, v_sk_tech_webarch, 'Strong API understanding'),
    (v_user_id, v_sk_tech_webarch, 'Understand web architecture end to end (browser to cloud infrastructure)'),
    (v_user_id, v_sk_tech_enterprise, 'Understand enterprise security basics: RBAC, SSO, SOC 2, audit logs, encryption, tenant isolation'),
    (v_user_id, v_sk_tech_enterprise, 'Explain your architecture without AI')
  on conflict (user_id, skill_id, title) do nothing;

  -- AI Engineering
  insert into public.skills (user_id, category_id, name, sort) values (v_user_id, v_cat_ai, 'LLM Applications', 1)
    on conflict (user_id, category_id, name) do update set sort = excluded.sort returning id into v_sk_ai_llm;
  insert into public.skills (user_id, category_id, name, sort) values (v_user_id, v_cat_ai, 'Reliability & Evals', 2)
    on conflict (user_id, category_id, name) do update set sort = excluded.sort returning id into v_sk_ai_reliability;
  insert into public.skills (user_id, category_id, name, sort) values (v_user_id, v_cat_ai, 'Enterprise AI', 3)
    on conflict (user_id, category_id, name) do update set sort = excluded.sort returning id into v_sk_ai_enterprise;

  insert into public.skill_milestones (user_id, skill_id, title) values
    (v_user_id, v_sk_ai_llm, 'Build a RAG search project'),
    (v_user_id, v_sk_ai_llm, 'Build a tool-using agent'),
    (v_user_id, v_sk_ai_llm, 'Build an AI workflow with human review'),
    (v_user_id, v_sk_ai_llm, 'Build a multi-step enterprise automation'),
    (v_user_id, v_sk_ai_llm, 'Build an agent with a 100-case eval suite'),
    (v_user_id, v_sk_ai_reliability, 'Build an evaluation harness'),
    (v_user_id, v_sk_ai_reliability, 'Understand AI economics: latency, context windows, token costs'),
    (v_user_id, v_sk_ai_enterprise, 'Understand enterprise AI concerns: PII, audit logging, data retention, SOC 2, RBAC, SSO, encryption, tenant isolation')
  on conflict (user_id, skill_id, title) do nothing;

  insert into public.skill_resources (user_id, skill_id, kind, title, how_to_use) values
    (v_user_id, v_sk_ai_llm, 'book', 'AI Engineering - Chip Huyen',
     'Month 4 of the 12-month curriculum; build one AI workflow: input, LLM, tool use, structured output, database, eval system.')
  on conflict (user_id, skill_id, title) do nothing;

  -- Finance
  insert into public.skills (user_id, category_id, name, sort) values (v_user_id, v_cat_finance, 'Accounting & SaaS Metrics', 1)
    on conflict (user_id, category_id, name) do update set sort = excluded.sort returning id into v_sk_fin_accounting;
  insert into public.skills (user_id, category_id, name, sort) values (v_user_id, v_cat_finance, 'Startup Finance & Cap Tables', 2)
    on conflict (user_id, category_id, name) do update set sort = excluded.sort returning id into v_sk_fin_startup;

  insert into public.skill_milestones (user_id, skill_id, title) values
    (v_user_id, v_sk_fin_accounting, 'Learn accounting: income statement, balance sheet, cash-flow statement'),
    (v_user_id, v_sk_fin_accounting, 'Learn SaaS metrics: ARR, MRR, ARPU, CAC, LTV, payback, gross margin, churn, NRR, burn, runway'),
    (v_user_id, v_sk_fin_startup, 'Learn startup finance: pre/post-money, SAFEs, preferred shares, liquidation preference, option pools, dilution, pro rata, board control'),
    (v_user_id, v_sk_fin_startup, 'Learn cap tables')
  on conflict (user_id, skill_id, title) do nothing;

  insert into public.skill_resources (user_id, skill_id, kind, title, how_to_use) values
    (v_user_id, v_sk_fin_startup, 'book', 'Venture Deals - Brad Feld & Jason Mendelson',
     'Month 10 of the 12-month curriculum; understand exactly what happens when you raise capital.'),
    (v_user_id, v_sk_fin_startup, 'book', 'The Outsiders - William Thorndike',
     'Month 11 of the 12-month curriculum; study CEOs as capital allocators.')
  on conflict (user_id, skill_id, title) do nothing;

  -- Leadership
  insert into public.skills (user_id, category_id, name, sort) values (v_user_id, v_cat_leadership, 'People Management', 1)
    on conflict (user_id, category_id, name) do update set sort = excluded.sort returning id into v_sk_lead_people;
  insert into public.skills (user_id, category_id, name, sort) values (v_user_id, v_cat_leadership, 'Organizational Design', 2)
    on conflict (user_id, category_id, name) do update set sort = excluded.sort returning id into v_sk_lead_org;

  insert into public.skill_milestones (user_id, skill_id, title) values
    (v_user_id, v_sk_lead_people, 'Practice weekly 1:1s'),
    (v_user_id, v_sk_lead_people, 'Practice delegation and feedback'),
    (v_user_id, v_sk_lead_people, 'Improve recruiting ability'),
    (v_user_id, v_sk_lead_org, 'Learn hiring, firing, compensation, goal setting, conflict resolution, culture')
  on conflict (user_id, skill_id, title) do nothing;

  insert into public.skill_resources (user_id, skill_id, kind, title, how_to_use) values
    (v_user_id, v_sk_lead_people, 'book', 'High Output Management - Andy Grove',
     'Month 7 of the 12-month curriculum; practice weekly goals, 1:1s, measurement, delegation.'),
    (v_user_id, v_sk_lead_org, 'book', 'Good Strategy/Bad Strategy - Richard Rumelt',
     'Month 5 of the 12-month curriculum; output is a one-page "why will we win."'),
    (v_user_id, v_sk_lead_org, 'book', '7 Powers - Hamilton Helmer',
     'Month 6 of the 12-month curriculum; study the seven sources of competitive advantage.'),
    (v_user_id, v_sk_lead_org, 'book', 'Amp It Up - Frank Slootman',
     'Month 8 of the 12-month curriculum; apply it to standards, speed, focus, talent.'),
    (v_user_id, v_sk_lead_org, 'book', 'The Hard Thing About Hard Things - Ben Horowitz',
     'Month 9 of the 12-month curriculum; study firings, crisis management, leadership, company survival.')
  on conflict (user_id, skill_id, title) do nothing;

  -- Communication
  insert into public.skills (user_id, category_id, name, sort) values (v_user_id, v_cat_comm, 'Writing', 1)
    on conflict (user_id, category_id, name) do update set sort = excluded.sort returning id into v_sk_comm_writing;
  insert into public.skills (user_id, category_id, name, sort) values (v_user_id, v_cat_comm, 'Speaking', 2)
    on conflict (user_id, category_id, name) do update set sort = excluded.sort returning id into v_sk_comm_speaking;

  insert into public.skill_milestones (user_id, skill_id, title) values
    (v_user_id, v_sk_comm_writing, 'Write 50 weekly CEO memos'),
    (v_user_id, v_sk_comm_writing, 'Write one page every week (thesis, memo, postmortem, or insight)'),
    (v_user_id, v_sk_comm_speaking, 'Deliver a 60-second pitch'),
    (v_user_id, v_sk_comm_speaking, 'Deliver a 5-minute pitch'),
    (v_user_id, v_sk_comm_speaking, 'Run a 30-minute customer demo'),
    (v_user_id, v_sk_comm_speaking, 'Deliver an investor pitch'),
    (v_user_id, v_sk_comm_speaking, 'Deliver a recruiting pitch')
  on conflict (user_id, skill_id, title) do nothing;

  -- Racing Engineering (side tree)
  insert into public.skills (user_id, category_id, name, sort) values (v_user_id, v_cat_racing, 'Vehicle Fundamentals (Years 1-2)', 1)
    on conflict (user_id, category_id, name) do update set sort = excluded.sort returning id into v_sk_racing_fund;
  insert into public.skills (user_id, category_id, name, sort) values (v_user_id, v_cat_racing, 'Advanced Vehicle Dynamics (Years 3-5)', 2)
    on conflict (user_id, category_id, name) do update set sort = excluded.sort returning id into v_sk_racing_adv;

  insert into public.skill_milestones (user_id, skill_id, title) values
    (v_user_id, v_sk_racing_fund, 'Review physics fundamentals'),
    (v_user_id, v_sk_racing_fund, 'Learn basic mechanical engineering and CAD'),
    (v_user_id, v_sk_racing_fund, 'Understand internal combustion and EV powertrains'),
    (v_user_id, v_sk_racing_fund, 'Understand basic vehicle dynamics'),
    (v_user_id, v_sk_racing_adv, 'Study aerodynamics, suspension geometry, materials, composites, control systems, telemetry'),
    (v_user_id, v_sk_racing_adv, 'Understand downforce, drag, slip angle, weight transfer, camber, caster, spring rates, damping, braking balance, tire load sensitivity')
  on conflict (user_id, skill_id, title) do nothing;

end $$;
