import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

test("planner migration: atomic saves, idempotency, cooldown and account isolation", async () => {
  const db = new PGlite();
  try {
    await db.exec(`
      create role authenticated; create role anon;
      create schema auth;
      create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('app.user_id',true),'')::uuid $$;
      grant usage on schema auth to authenticated;
      grant execute on function auth.uid() to authenticated;
      insert into auth.users values ('11111111-1111-4111-8111-111111111111'),('22222222-2222-4222-8222-222222222222');
      create table public.profiles(id uuid, timezone text);
      create table public.schedule_templates(user_id uuid, weekday integer, start_time time,end_time time,title text,category text);
      create table public.schedule_blocks (
        id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id),
        date date not null, start_at timestamptz not null, end_at timestamptz not null,
        title text not null, category text not null, source text not null default 'manual',done boolean not null default false
      );
      alter table public.schedule_blocks enable row level security;
      create policy own on public.schedule_blocks for all to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
    `);
    await db.exec(await readFile(new URL("../supabase/migrations/0012_canvas_planner.sql",import.meta.url),"utf8"));
    await db.exec(`grant select,insert,update,delete on all tables in schema public to authenticated; set role authenticated; set app.user_id = '11111111-1111-4111-8111-111111111111';`);
    const block = {date:"2099-01-01",start_at:"2099-01-01T15:00:00Z",end_at:"2099-01-01T16:00:00Z",title:"Essay",category:"School",assignment_id:null};
    const { rows } = await db.query<{id:string}>("insert into planning_drafts(blocks) values($1) returning id",[JSON.stringify([block])]);
    const id = rows[0].id;
    assert.equal((await db.query("select * from confirm_planning_draft($1)",[id])).rows.length,1);
    assert.equal((await db.query("select * from confirm_planning_draft($1)",[id])).rows.length,1);
    assert.equal((await db.query("select * from schedule_blocks")).rows.length,1);
    const conflict = await db.query<{id:string}>("insert into planning_drafts(blocks) values($1) returning id",[JSON.stringify([{...block,start_at:"2099-01-01T12:00:00Z",end_at:"2099-01-01T13:00:00Z"},block])]);
    await assert.rejects(db.query("select * from confirm_planning_draft($1)",[conflict.rows[0].id]),/calendar changed/);
    assert.equal((await db.query("select * from schedule_blocks")).rows.length,1,"the non-conflicting first block must be rolled back too");
    const expired = await db.query<{id:string}>("insert into planning_drafts(blocks,created_at) values($1,now()-interval '2 hours') returning id",[JSON.stringify([block])]);
    await assert.rejects(db.query("select * from confirm_planning_draft($1)",[expired.rows[0].id]),/expired/);
    assert.equal((await db.query<{claim_planner_ai:boolean}>("select claim_planner_ai()")).rows[0].claim_planner_ai,true);
    assert.equal((await db.query<{claim_planner_ai:boolean}>("select claim_planner_ai()")).rows[0].claim_planner_ai,false);
    await db.exec("insert into schedule_templates values('11111111-1111-4111-8111-111111111111',extract(isodow from date '2099-01-02'), '08:00','09:00','Class','School')");
    const future = await db.query<{id:string}>("insert into planning_drafts(blocks) values($1) returning id",[JSON.stringify([{...block,date:"2099-01-02",start_at:"2099-01-02T17:00:00Z",end_at:"2099-01-02T18:00:00Z"}])]);
    await db.query("select * from confirm_planning_draft($1)",[future.rows[0].id]);
    assert.equal((await db.query("select * from schedule_blocks where source='template' and date='2099-01-02'")).rows.length,1,"planning future work must retain template commitments");
    const assignment = await db.query<{id:string}>("insert into canvas_assignments(external_id,course_id,course_name,title,url,due_at) values('a','c','Course','Essay','https://byu.instructure.com','2099-01-03T14:00:00Z') returning id");
    const late = await db.query<{id:string}>("insert into planning_drafts(blocks) values($1) returning id",[JSON.stringify([{...block,date:"2099-01-03",start_at:"2099-01-03T17:00:00Z",end_at:"2099-01-03T18:00:00Z",assignment_id:assignment.rows[0].id}])]);
    await assert.rejects(db.query("select * from confirm_planning_draft($1)",[late.rows[0].id]),/deadline passed/);
    await db.exec("set app.user_id = '22222222-2222-4222-8222-222222222222'");
    assert.equal((await db.query("select * from schedule_blocks")).rows.length,0);
    await assert.rejects(db.query("select * from confirm_planning_draft($1)",[id]),/Plan not found/);
    await assert.rejects(db.query("insert into canvas_connections(user_id,token_ciphertext) values('11111111-1111-4111-8111-111111111111','ciphertext')"),/row-level security/);
  } finally { await db.close(); }
});
