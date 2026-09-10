-- Switch from a dedicated "1B" secondary calendar to writing/reading
-- directly on the user's primary Google calendar (Brayden's call — he
-- wants this in the calendar he already uses day to day, not a second
-- one). Ownership of a primary-calendar event is now determined at sync
-- time by whether it carries the app's extendedProperties.private.
-- app_category marker, not by which calendar it lives on — see
-- lib/google.ts's syncPrimaryCalendar. Nothing had been pushed to the old
-- "1B" calendar yet (checked before writing this), so there's no data to
-- migrate off it.
update public.google_tokens set calendar_id = 'primary';

alter table public.google_tokens drop column onebillion_sync_token;

-- Per-event recurrence metadata for the Google-native "repeat on weekdays"
-- feature (real RRULE series, not the app's separate schedule_templates
-- whole-day-skeleton system): google_recurring_event_id is the series'
-- master event id, shared by every local row/instance in the series (null
-- for a one-off block). recurrence_days is a denormalized copy of which
-- ISO weekdays (1=Mon..7=Sun) the series repeats on, kept per-row purely
-- so the block editor can pre-populate its day picker without an extra
-- Google API call — Google's RRULE on the master event stays the source
-- of truth for actual scheduling.
alter table public.schedule_blocks add column google_recurring_event_id text;
alter table public.schedule_blocks add column recurrence_days int[];
