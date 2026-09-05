-- Phase 1: read-only aggregate views used by the app.
-- security_invoker = true makes each view run with the querying user's
-- privileges, so the RLS policies on the underlying tables still apply.

-- Weekly totals per metric, for the scorecard (Phase 5).
-- date_trunc('week', ...) is Monday-start (ISO 8601), matching week_start = 'mon'.
create view public.weekly_metric_totals
  with (security_invoker = true) as
select
  ml.user_id,
  ml.metric_id,
  date_trunc('week', ml.date::timestamp)::date as week_start,
  sum(ml.value) as total
from public.metric_logs ml
group by ml.user_id, ml.metric_id, date_trunc('week', ml.date::timestamp)::date;

-- Per-problem aggregates for the CRM "evidence, not intuition" view (Phase 6).
create view public.problem_aggregates
  with (security_invoker = true) as
select
  p.id as problem_id,
  p.user_id,
  p.title,
  count(ip.id) as times_mentioned,
  avg(ip.pain_score) as avg_pain_score,
  round(
    100.0 * count(*) filter (where i.would_pilot = 'yes') / nullif(count(ip.id), 0)
  ) as pilot_pct,
  array_remove(array_agg(distinct c.industry), null) as industries
from public.problems p
left join public.interview_problems ip on ip.problem_id = p.id
left join public.interviews i on i.id = ip.interview_id
left join public.contacts c on c.id = i.contact_id
group by p.id, p.user_id, p.title;
