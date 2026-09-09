-- Simplification pass (2026-09-05 decisions, executed 2026-09-08): cut the
-- CRM/problem database and idea parking lot, flatten the skill tree to a
-- manual per-skill status, collapse the goal hierarchy from 8 levels to 4.
-- Brayden exported contacts/interviews/problems/ideas to CSV before this
-- ran (Settings CSV export, since removed) — see PLAN.md changelog.

-- ---------------------------------------------------------------------------
-- CRM + problem database
-- ---------------------------------------------------------------------------
drop view if exists public.problem_aggregates;
drop table if exists public.interview_problems;
drop table if exists public.interviews;
drop table if exists public.problems;
drop table if exists public.contacts;

-- ---------------------------------------------------------------------------
-- idea parking lot
-- ---------------------------------------------------------------------------
drop table if exists public.ideas;

-- ---------------------------------------------------------------------------
-- skill tree: drop milestones + resources, add a manual status to skills
-- ---------------------------------------------------------------------------
drop table if exists public.skill_milestones;
drop table if exists public.skill_resources;

alter table public.skills
  add column status text not null default 'not_started'
    check (status in ('not_started', 'in_progress', 'proven'));

-- ---------------------------------------------------------------------------
-- goal hierarchy: collapse dream/10yr/3yr/1yr/quarter/month/week/today
-- down to dream/month/week/today. Reparent any goal whose parent sits at a
-- dropped level up to its nearest surviving ancestor, then delete the
-- dropped-level rows before tightening the check constraint.
-- ---------------------------------------------------------------------------
do $$
declare
  dropped_levels text[] := array['10yr', '3yr', '1yr', 'quarter'];
begin
  -- Repeat until no goal's parent sits at a dropped level (handles chains
  -- of several dropped levels stacked on top of each other).
  loop
    update public.goals g
    set parent_id = p.parent_id
    from public.goals p
    where g.parent_id = p.id
      and p.level = any(dropped_levels);

    exit when not found;
  end loop;

  delete from public.goals where level = any(dropped_levels);
end $$;

alter table public.goals drop constraint goals_level_check;
alter table public.goals
  add constraint goals_level_check check (level in ('dream', 'month', 'week', 'today'));
