-- Phase 9: hourly trigger for POST /api/cron/tick.
--
-- Vercel Hobby caps cron jobs at once/day (anything more frequent is
-- rejected at deploy time), so per PLAN.md §6 Phase 9 step 5's fallback,
-- this uses Supabase pg_cron + pg_net to POST the same route every hour
-- instead of a vercel.json cron entry — same code, different trigger.
--
-- The request's Authorization header is read from Supabase Vault at call
-- time, not embedded here, so CRON_SECRET is never committed to the repo.
-- One-time manual step (run once in the Supabase SQL Editor, not by this
-- migration): copy CRON_SECRET's value from .env.local, then run
--   select vault.create_secret('<paste the value here>', 'cron_secret');
-- Until that secret exists, the hourly call will 401 harmlessly.

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'hourly-notification-tick',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://1billion.vercel.app/api/cron/tick',
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'),
      'Content-Type', 'application/json'
    ),
    body := '{}'::jsonb
  );
  $$
);
