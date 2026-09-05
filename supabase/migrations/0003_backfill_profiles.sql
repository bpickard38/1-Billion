-- Backfill profiles for any auth.users created before the
-- on_auth_user_created trigger existed (0001_core.sql).
insert into public.profiles (id)
select id from auth.users
on conflict (id) do nothing;
