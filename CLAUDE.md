@AGENTS.md

# 1 Billion — rules for Claude

Read `PLAN.md` first. Work on exactly the phase Brayden names. Nothing else.

## Every session
1. Before writing code, list the files you will create or modify. If any are outside the phase's scope, stop and ask.
2. Never edit an applied migration. Add a new numbered file in `supabase/migrations/`.
3. No new npm packages beyond the approved list in `PLAN.md` §4 without asking.
4. Do not refactor, rename or "clean up" earlier phases unless the phase says so.
5. Do not invent features. One question if ambiguous, then proceed.
6. Mobile first: 390px iPhone before desktop.
7. Boring wins. No abstraction until the third repetition.

## Done means
- `npm run typecheck`, `npm run lint`, `npm run build` all pass.
- Manual test checklist for the phase is in the commit message.
- One commit: `phase N: <name>`.
- A 5-line "What to understand" note appended to `PLAN.md` §8.

## Layout
```
app/(app)/*     authenticated screens (today, week, goals, crm, more)
app/login       email + password only; sign-ups are disabled in Supabase
app/api         route handlers (cron, push, google) — later phases
components/     small, dumb UI pieces
lib/supabase/   browser client, server client, proxy session refresh
lib/*.ts        pure logic (score, dates) — unit-tested
supabase/       migrations + seed.sql
public/         manifest.json, sw.js, icons/
proxy.ts        Next.js 16 "proxy" (was middleware): session refresh + auth redirects
```

## Environment
Secrets live in `.env.local` (gitignored) and Vercel env vars. Never paste keys into chat or commit them.
Node modules are not installed inside the OneDrive folder from the Claude VM (too slow). To verify, copy the source to `$HOME/build`, `npm install` there, run checks, and never copy `node_modules` back.
