/** App routes under /systems/ that a system's slug must never shadow. */
const RESERVED = new Set(["new", "history", "reorder"]);

/** "Morning Routine!" -> "morning-routine". Matches the backfill in 0018_system_slugs.sql. */
export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 60)
    .replace(/^-+|-+$/g, "");
  if (!slug) return "system";
  return RESERVED.has(slug) ? `${slug}-system` : slug;
}

/** `slugify(name)`, plus "-2", "-3"... if another system already uses it. */
export function uniqueSlug(name: string, taken: ReadonlySet<string>): string {
  const base = slugify(name);
  if (!taken.has(base)) return base;
  for (let n = 2; ; n++) {
    if (!taken.has(`${base}-${n}`)) return `${base}-${n}`;
  }
}
