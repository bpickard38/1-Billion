-- Product decision (2026-09-05): drop metrics tracking entirely. The app is
-- habit-only going forward; habit streaks are derived from habit_logs, not
-- a new stored column. See PLAN.md changelog.
drop view if exists public.weekly_metric_totals;
drop table if exists public.metric_logs;
drop table if exists public.metrics;
