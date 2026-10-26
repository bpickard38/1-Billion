import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

const REAL = "11111111-1111-4111-8111-111111111111";
const DEMO = "22222222-2222-4222-8222-222222222222";

test("seed_demo: refuses real accounts, seeds anonymous ones relative to today, runs once", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role authenticated; create role anon;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.user_id',true),'')::uuid $$;
      create function auth.jwt() returns jsonb language sql stable as $$ select coalesce(nullif(current_setting('app.jwt',true),''),'{}')::jsonb $$;
      grant usage on schema auth to authenticated;
      grant execute on all functions in schema auth to authenticated;
      insert into auth.users values ('${REAL}'),('${DEMO}');

      create table public.profiles(id uuid primary key, timezone text, north_star text);
      create table public.goals(id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), level text, parent_id uuid, title text, target_value numeric, target_unit text, current_value numeric default 0, starts_on date, ends_on date, status text);
      create table public.todos(user_id uuid not null default auth.uid(), date date, title text, sort int, done boolean);
      create table public.weekly_reviews(user_id uuid not null default auth.uid(), week_start date, score int, closed_at timestamptz, biggest_issue text, answers jsonb, breakdown jsonb);
      create table public.schedule_blocks(user_id uuid not null default auth.uid(), date date, start_at timestamptz, end_at timestamptz, title text, category text, source text, done boolean);
      create table public.skill_categories(id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid(), name text, sort int);
      create table public.skills(user_id uuid not null default auth.uid(), category_id uuid, name text, status text, sort int);
      insert into public.profiles(id, timezone) values ('${REAL}','America/Denver'),('${DEMO}','America/Denver');
    `);
    for (const t of ["profiles", "goals", "todos", "weekly_reviews", "schedule_blocks", "skill_categories", "skills"]) {
      const key = t === "profiles" ? "id" : "user_id";
      await db.exec(`alter table public.${t} enable row level security; create policy own on public.${t} for all to authenticated using (${key} = auth.uid()) with check (${key} = auth.uid());`);
    }
    for (const file of ["0014_demo_seed.sql", "0015_demo_seed_goal_progress.sql"]) {
      await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8"));
    }
    await db.exec(`grant select, insert, update, delete on all tables in schema public to authenticated; set role authenticated;`);

    // A real (non-anonymous) account is refused and left untouched.
    await db.exec(`set app.user_id = '${REAL}'; set app.jwt = '{"is_anonymous": false}';`);
    await assert.rejects(db.query("select public.seed_demo()"), /only for demo accounts/);
    assert.equal((await db.query<{ n: number }>("select count(*)::int n from goals")).rows[0].n, 0);

    // An anonymous account gets a full, today-relative demo.
    await db.exec(`set app.user_id = '${DEMO}'; set app.jwt = '{"is_anonymous": true}';`);
    await db.query("select public.seed_demo()");
    const count = async (sql: string) => (await db.query<{ n: number }>(sql)).rows[0].n;
    const today = `(now() at time zone 'America/Denver')::date`;
    assert.equal(await count("select count(*)::int n from goals"), 5);
    // One month goal (so Today's header shows it) with 2 of 3 weekly goals done = 67%.
    assert.equal(await count("select count(*)::int n from goals where level = 'month'"), 1);
    assert.equal(await count("select count(*)::int n from goals c join goals m on c.parent_id = m.id where m.level = 'month' and c.status = 'done'"), 2);
    assert.equal(await count(`select count(*)::int n from todos where date = ${today}`), 5);
    assert.equal(await count(`select count(distinct date)::int n from schedule_blocks`), 3);
    assert.equal(await count(`select count(*)::int n from schedule_blocks where date = ${today} + 1`), 4);
    assert.equal(await count("select count(*)::int n from skills"), 8);
    const review = (await db.query<{ score: number; days: number }>("select score, jsonb_array_length(breakdown) days from weekly_reviews")).rows;
    assert.equal(review.length, 1);
    assert.equal(review[0].days, 7);
    assert.ok(review[0].score > 0 && review[0].score < 100);

    // A second call is a no-op.
    await db.query("select public.seed_demo()");
    assert.equal(await count("select count(*)::int n from goals"), 5);

    // Another account can't see the demo rows.
    await db.exec(`set app.user_id = '${REAL}';`);
    assert.equal(await count("select count(*)::int n from todos"), 0);
  } finally {
    await db.close();
  }
});
