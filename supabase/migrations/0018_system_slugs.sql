-- Readable URLs: /systems/morning instead of /systems/<uuid>.
-- The slug is derived from the name (lib/slug.ts does the same in the app)
-- and is unique per user. "new", "history" and "reorder" are app routes,
-- so a system with one of those names gets a "-system" suffix.

alter table public.systems add column slug text;

update public.systems
set slug = coalesce(nullif(trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')), ''), 'system');

update public.systems
set slug = slug || '-system'
where slug in ('new', 'history', 'reorder');

with ranked as (
  select id, slug, row_number() over (partition by user_id, slug order by created_at) as rn
  from public.systems
)
update public.systems s
set slug = r.slug || '-' || r.rn
from ranked r
where s.id = r.id and r.rn > 1;

alter table public.systems
  alter column slug set not null,
  add constraint systems_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  add constraint systems_user_slug_key unique (user_id, slug);
