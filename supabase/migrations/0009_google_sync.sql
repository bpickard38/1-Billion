-- Phase 10 (second half): two-way sync needs a source value for read-only
-- primary-calendar imports, distinct from the "1B" calendar's 'google' rows
-- (which the app can still edit and push back) — and a category for events
-- that didn't originate from the app (no app_category extended property to
-- carry over). Constraint names follow Postgres's default
-- <table>_<column>_check, confirmed against 0001_core.sql's originals.
alter table public.schedule_blocks drop constraint schedule_blocks_source_check;
alter table public.schedule_blocks add constraint schedule_blocks_source_check
  check (source in ('template', 'manual', 'google', 'google_primary'));

alter table public.schedule_blocks drop constraint schedule_blocks_category_check;
alter table public.schedule_blocks add constraint schedule_blocks_category_check
  check (
    category in (
      'Faith/Family', 'Health', 'School', 'Startup-Customers',
      'Startup-Build', 'Startup-Strategy', 'Learning', 'Racing', 'Rest',
      'Google'
    )
  );

-- One local row per remote event, so an incremental pull can upsert by
-- (user_id, google_event_id) instead of select-then-branch for every event.
create unique index schedule_blocks_user_google_event_id_key
  on public.schedule_blocks (user_id, google_event_id)
  where google_event_id is not null;
