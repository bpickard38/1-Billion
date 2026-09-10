-- 0009's partial unique index (`where google_event_id is not null`) can't
-- serve as an ON CONFLICT arbiter for a plain `on_conflict=user_id,
-- google_event_id` upsert — PostgREST issues `ON CONFLICT (user_id,
-- google_event_id) DO UPDATE` with no WHERE clause, which only matches a
-- full (non-partial) index. Every pull-sync upsert into schedule_blocks was
-- failing with 42P10 as a result. Postgres already treats NULL <> NULL in a
-- unique constraint, so a non-partial constraint enforces the same "no two
-- rows share a real google_event_id" rule while actually working as an
-- upsert target.
drop index public.schedule_blocks_user_google_event_id_key;
alter table public.schedule_blocks
  add constraint schedule_blocks_user_google_event_id_key unique (user_id, google_event_id);
