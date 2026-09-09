-- Phase 10: Google Calendar two-way sync. One row per user (a user has at
-- most one Google connection); RLS keeps every user's tokens to themselves.
--
-- Two sync tokens, not one: Google's incremental-sync API issues a
-- syncToken per calendar, and this app tracks two calendars per user (the
-- primary, read-only, and the "1B" calendar, read-write) — §5's single
-- `sync_token` column couldn't represent both, so it's split here.
create table public.google_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid() unique,
  refresh_token text not null,
  access_token text,
  expires_at timestamptz,
  calendar_id text,
  primary_sync_token text,
  onebillion_sync_token text,
  last_synced_at timestamptz,
  last_sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.google_tokens enable row level security;

create policy "own rows" on public.google_tokens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create trigger set_updated_at before update on public.google_tokens
  for each row execute function public.set_updated_at();

-- schedule_blocks already has source ('template'/'manual'/'google') and
-- google_event_id/google_etag from §5's original Phase 1 table — no change
-- needed there.
