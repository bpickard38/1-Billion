# 1 BILLION — Implementation Plan

Personal Founder OS. Web app + PWA saved to iPhone home screen.

> The app is not the mission. The app exists to make me execute the mission.

This file lives at the root of the repo as `PLAN.md`. Claude reads it at the start of every session and works on exactly one phase at a time. Edit anything here before a phase starts. Anything marked `[DECIDE]` is a choice you can flip; anything marked `[VERIFY]` is something Claude must confirm at build time rather than assume.

---

## 0. Decisions already made

| Item | Decision |
|---|---|
| v1 features | Today page, habits (with per-habit streaks), daily schedule (editable, Google Calendar two-way sync), goal hierarchy, weekly review gate + streak, customer research CRM + problem database, idea parking lot, skill tree (milestones + research resources), iPhone web push. Daily/weekly metrics tracking was cut 2026-09-05 — the app is habit-only. |
| Phase 2 (after v1 is in daily use) | Decision journal + financial cooling timer, AI coach, monthly CEO review |
| Stack | Next.js (App Router) + TypeScript + Tailwind, Supabase (Postgres, Auth, RLS), Vercel, `web-push`, Google Calendar API |
| Score weighting | Cut with metrics 2026-09-05 — Phase 5 needs a new, habit-only definition |
| Seed data | Seeded from the "1 Billion dollars" doc on first run |
| Build location | Local folder on Brayden's PC, pushed to GitHub, auto-deployed by Vercel |
| Users | Multiple. Public self-serve sign-up (`/signup`, Supabase Auth email+password). Each user's data is isolated by RLS (`user_id = auth.uid()`) — there is no shared/org data model, just N independent accounts. Decided 2026-09-04, reversing the original "one user" decision. |
| Native app | No. PWA only. |

Not building: microservices, custom auth (still Supabase Auth), agents, native apps, real-time collaboration, org/team/shared-workspace features.

---

## 1. Rules for Claude (read every session)

1. Read `PLAN.md` and `CLAUDE.md` first. Work only on the phase Brayden names. Do not start the next phase.
2. Before writing code in a phase, list the files you will create/modify. Wait for an OK if the list touches anything outside the phase's scope.
3. Never edit a migration that has already been applied. Add a new numbered migration.
4. No new npm packages beyond the approved list (Section 4) without asking. State why.
5. Every phase ends with: `npm run typecheck` passes, `npm run lint` passes, `npm run build` passes, the phase's manual test checklist is written into the commit message, and one git commit named `phase N: <name>`.
6. Do not refactor, rename, or "clean up" code from earlier phases unless the phase says so.
7. Do not invent features. If something in the plan is ambiguous, ask one question, then proceed.
8. Mobile first. Every screen is designed for a 390px-wide iPhone before desktop.
9. Keep it boring. The simplest thing that works. No abstraction until the third repetition.
10. After each phase, write a 5-line "What to understand" note for Brayden (Section 8) covering one part of the system he should be able to explain without AI.

---

## 2. What Brayden does vs. what Claude does

**Brayden (once, Phase 0):** create the GitHub repo, Supabase project, Vercel project, Google Cloud project; paste keys into `.env.local` and Vercel env vars; connect the folder to Claude; run manual tests on the iPhone after each phase.

**Claude:** everything in the code, migrations, seed file, and deploy config. Claude never sees or asks for service-role keys in chat; they go straight into `.env.local` and Vercel.

---

## 3. Product spec (what v1 does)

### 3.1 Navigation
Bottom tab bar, 5 tabs: **Today · Week · Goals · CRM · More**. "More" holds Skills, Ideas, Schedule settings, Settings. Dark theme default. No marketing pages, no onboarding tour.

### 3.2 Today (home screen)
Top to bottom, nothing else:
- Header strip: NORTH STAR one-liner · this quarter's goal with progress bar · current week score · streak ("12 weeks").
- **#1 Priority today** — one line, editable, linked to a goal (tap → trace-back chain up to the Dream).
- **Schedule** — today's time blocks (from Phase 3), collapsed to the current + next block; tap to expand/edit.
- **Habits** — checkboxes, each showing its current streak (consecutive scheduled days completed, derived from `habit_logs`). Default set: Spiritual study, Workout, Deep work, Customer/outbound work, Technical learning, Read, Uncomfortable rep, Daily review. An "Add habit" control lets Brayden add more from the page.
- **Daily review** button (evening): three fields — What did I accomplish? What did I learn? Tomorrow's #1 task. Submitting it (a) sets tomorrow's #1 Priority, (b) checks the "Daily review" habit.

Rule: the page must load and be usable in under 2 seconds on LTE. No charts on this page.

### 3.3 Daily schedule
- A **template per weekday** seeded from the doc (Mon CEO/Sales, Tue Customers+Product, Wed Build, Thu Sell, Fri Strategy, Sat Deep Development, Sun protected) on the doc's daily skeleton (6:30 wake → 10:30 sleep).
- Each morning, today's blocks are materialized from the template (once) and can be edited freely: move, resize, rename, delete, add. Edits to today never change the template unless "Save as template" is tapped.
- Blocks have a category: Faith/Family, Health, School, Startup–Customers, Startup–Build, Startup–Strategy, Learning, Racing, Rest.
- Two-way Google Calendar sync (Phase 10): app blocks appear on a dedicated "1B" Google calendar; events on your primary Google calendar (classes, meetings) show read-only inside the day view.

### 3.4 Goals
Levels: Dream → 10-year → 3-year → 1-year → Quarter → Month → Week → Today. Each goal has a parent, title, optional metric target (e.g. "20 interviews"), status, and dates. Views:
- Tree view (collapsible).
- Trace-back: from any goal or the Today priority, show the full chain up to the Dream.
- Quarter progress bar = % of the quarter's child month/week goals completed, or a manual %.

Seeded chain: Build a billion-dollar company → significant equity in a $1B+ business → meaningful B2B AI company → $10k+ MRR + 100 customer conversations → Validate one painful vertical workflow (Q1: 30–40 healthcare + 15–20 energy interviews) → 20 interviews this month → 5 interviews this week → today's action.

### 3.5 Week (scorecard + review)
- Week runs Monday → Sunday.
- `[DECIDE — Phase 5, not designed yet]` Metrics tracking was cut 2026-09-05, so the old metrics-weighted score (0.7 output / 0.2 input / 0.1 habit) no longer applies. Phase 5 needs a new score definition based on habit completion (and per-habit streaks) only — ask Brayden one question about the formula before building it, per rule 7.
- **Friday review gate.** From Friday 5:00 PM local until the week closes, opening the app shows a full-screen "Weekly Review Required" card (dismissable for 2 hours at a time so you can still log things). Seven questions: accomplished / failed / why / what customers taught me / wasted time on / biggest bottleneck / next week's top 3. Submitting closes the week, freezes the score, auto-creates next week's three Week-level goals, and increments the streak. `[DECIDE]` At Monday 00:00 an unreviewed week auto-closes with its score and the streak resets to 0.
- Week detail shows the review answers and the score breakdown. The old auto-generated "Biggest issue" line was metric-based (e.g. "Build hours 9, customer conversations 2") — Phase 5 needs a habit-based version of this rule, or it can be dropped.

### 3.6 CRM + problem database
Three linked things:
- **Contacts** — name, company, industry, role, type (customer research / founder / industry expert / vendor), email, phone, LinkedIn, where met, expertise, what they care about, how I can help them, last contact date, follow-up date, would pilot? (yes/maybe/no), notes. This doubles as the networking CRM from the doc.
- **Interviews** — linked to a contact: date, raw notes, current solution, estimated cost of the problem, pain score 1–10, would pilot?, follow-up action. One interview can tag multiple problems.
- **Problems** — the doc's problem-database columns: problem, user, buyer, frequency, existing solution, labor cost, revenue impact, urgency /10, WTP, AI opportunity /10, competition, TAM, expansion, access, score /100 (manual or computed `[DECIDE]`).
- **Aggregation view** — per problem: times mentioned, average pain score, % who would pilot, industries. Sorted by mentions × avg pain. This is the "choose with evidence" screen.
- Follow-ups due today/overdue show as a count on the CRM tab and as a line on Today.
- CSV export of all three tables (Settings).

### 3.7 Skill tree
- Categories seeded from the doc: Sales, Product, Technology, AI Engineering, Finance, Leadership, Communication (+ Racing Engineering as a side tree).
- Each skill has: status (🔴 not started / 🟡 in progress / ✅ proven), a list of **proof-of-skill milestones** (e.g., "Make 100 cold calls", "Close a $1,000+ B2B contract", "Build an agent with a 100-case eval suite"), and a list of **research resources** (book, podcast episode, doc, course, person to ask) with a note on *how* to learn it.
- Bar % = proven milestones ÷ total milestones. Studying a resource never moves the bar. Checking a milestone requires a one-line "proof" (what/when).
- Seeded milestones come from the doc's Part XVI scoreboard and the monthly curriculum (book + output per month).

### 3.8 Idea parking lot
Fields: idea, why interesting, date, research later? (yes/no), status (parked / researched / killed / doing). One-tap add from anywhere (floating button). On the 1st of each month, Today shows "Review 7 parked ideas" until done. That is the only time the list is surfaced.

### 3.9 Notifications (web push, iPhone)
- 6:45 AM: "Set today's ONE thing." (if #1 Priority is empty)
- 4:00 PM weekdays: "Uncomfortable rep done?" (if habit unchecked) `[DECIDE]`
- 9:30 PM: "Daily review." (if not submitted)
- Friday 5:00 PM: "Weekly Review Required."
- Follow-up reminders from the CRM at 8:00 AM on the due date.
All times in `America/Denver`; each notification has an on/off toggle in Settings.

---

## 4. Tech stack and approved packages

- `next` (App Router), `react`, `typescript`, `tailwindcss`
- `@supabase/supabase-js`, `@supabase/ssr`
- `zod` (validation), `date-fns` + `date-fns-tz` (all date math; never hand-roll timezone logic)
- `web-push` (push), `googleapis` (Calendar), `serwist` or a hand-written `sw.js` for the service worker `[DECIDE — hand-written is fewer moving parts]`
- `lucide-react` (icons)
- Dev: `eslint`, `prettier`, `supabase` CLI

Not approved without asking: state libraries (Redux/Zustand), ORMs (Prisma/Drizzle — use Supabase client + typed queries), UI kits, charting libs (v1 has no charts beyond CSS bars), tRPC, any auth library.

Project layout:
```
/app                 routes (app router)
  /(app)             authenticated pages: today, week, goals, crm, more/...
  /api               route handlers: cron, push, google
  /login
/components          small, dumb UI pieces
/lib
  /supabase          client, server client, typed helpers
  /score.ts          weekly score math (pure function, unit-tested)
  /dates.ts          week boundaries, timezone helpers (pure, unit-tested)
  /google.ts         calendar client + sync
/supabase
  /migrations        0001_..., 0002_... (SQL)
  /seed.sql          idempotent seed from the doc
/public
  manifest.json, sw.js, icons/
PLAN.md  CLAUDE.md  README.md
```

---

## 5. Data model (Supabase / Postgres)

All tables have `id uuid pk`, `user_id uuid references auth.users`, `created_at`, `updated_at`. RLS on every table: `user_id = auth.uid()` for select/insert/update/delete. Enums as Postgres `text` with a `check` constraint (simpler to change than real enums).

| Table | Key columns |
|---|---|
| `profiles` | timezone (default America/Denver), week_start (mon), score_weights jsonb (unused since metrics were cut — Phase 5 redefines), north_star text, notification_prefs jsonb |
| `goals` | level (dream/10yr/3yr/1yr/quarter/month/week/today), parent_id, title, description, target_value, target_unit, current_value, status (active/done/dropped), starts_on, ends_on, sort |
| `habits` | name, days_of_week int[] (1–7), sort, active. Streaks are derived from `habit_logs`, not stored — see `/lib/streaks.ts`. |
| `habit_logs` | habit_id, date, done — unique(habit_id, date) |
| `daily_entries` | date, priority_text, priority_goal_id, accomplished, learned, tomorrow_priority, submitted_at — unique(user_id, date) |
| `weekly_reviews` | week_start date, answers jsonb (7 keys), score numeric, breakdown jsonb, biggest_issue text, closed_at, auto_closed bool — unique(user_id, week_start) |
| `schedule_templates` | weekday int, start_time, end_time, title, category, sort |
| `schedule_blocks` | date, start_at timestamptz, end_at, title, category, done, source (template/manual/google), google_event_id, google_etag |
| `contacts` | name, company, industry, role, type, email, phone, linkedin, where_met, expertise, interests, how_i_can_help, last_contact_on, follow_up_on, would_pilot, notes |
| `interviews` | contact_id, date, notes, current_solution, estimated_cost, pain_score, would_pilot, follow_up |
| `problems` | title, description, user_role, buyer, frequency, existing_solution, labor_cost, revenue_impact, urgency, wtp, ai_opportunity, competition, tam, expansion, access, score |
| `interview_problems` | interview_id, problem_id, pain_score, quote — unique(interview_id, problem_id) |
| `ideas` | title, why_interesting, research_later, status, reviewed_at |
| `skill_categories` | name, sort, is_side_tree |
| `skills` | category_id, name, sort |
| `skill_milestones` | skill_id, title, done, done_at, proof |
| `skill_resources` | skill_id, kind (book/podcast/doc/course/person/project), title, url, how_to_use |
| `push_subscriptions` | endpoint (unique), p256dh, auth, user_agent |
| `google_tokens` | refresh_token, access_token, expires_at, calendar_id ("1B" calendar), sync_token |

Views (SQL) used by the app: `problem_aggregates`. Score math (Phase 5, not yet designed) will live in `/lib/score.ts` (TypeScript), not SQL, so it's unit-testable — same pattern as `/lib/streaks.ts` for habit streaks.

---

## 6. Phases

Each phase = one Claude session (some may take two). Each has: Goal · Steps · Done when · Brayden's manual test. Do not start a phase until the previous one's test passed on the iPhone.

### Phase 0 — Setup and deploy an empty, installable app
**Brayden, before the session:**
1. Create GitHub repo `one-billion` (private). Clone it into a folder on your PC and connect that folder to Claude.
2. Supabase → New project (region: US West). Copy Project URL, anon key, service-role key.
3. Vercel → import the GitHub repo. Add env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`.
4. Supabase → Authentication → Providers → Email: enable. Authentication → Settings → confirm "Allow new users to sign up" is **on** (public self-serve sign-up, added 2026-09-04). `[DECIDE]` "Confirm email" is off for now — flip it on once real strangers can hit `/signup`, so an unowned inbox can't be used to create an account.

**Claude:**
1. `create-next-app` with TypeScript, Tailwind, App Router, `src/` off, ESLint.
2. Add `CLAUDE.md` (copy of Section 1 rules + layout), `README.md` (how to run, deploy, env vars), `.env.example`.
3. Supabase browser + server clients; middleware that redirects unauthenticated users to `/login`; `/login` page (email + password only, no sign-up link).
4. App shell: bottom tab bar with five empty pages. Dark theme. `viewport-fit=cover`, safe-area padding.
5. PWA: `manifest.json` (name "1 Billion", `display: standalone`, theme/background colors, 180/192/512 icons — plain "1B" text icon generated by script), `apple-touch-icon`, `apple-mobile-web-app-capable` meta. Minimal `sw.js` that installs and does nothing else yet (push handler comes in Phase 9).
6. `vercel.json` placeholder. Push. Confirm Vercel deploy.

**Done when:** deployed URL loads → login → 5 tabs → Safari "Add to Home Screen" → opens full-screen with no Safari chrome.
**Manual test:** install on iPhone, kill the app, reopen, still logged in.
**What to understand:** how a request goes browser → Vercel → Next.js server component → Supabase, and what the anon key vs. service-role key each can do.

### Phase 1 — Database, RLS, seed
**Claude:**
1. Install Supabase CLI, `supabase init`, link to the project.
2. Migration `0001_core.sql`: all tables in Section 5 except `push_subscriptions`, `google_tokens`; `updated_at` trigger; RLS policies on every table.
3. Migration `0002_views.sql`: `weekly_metric_totals`, `problem_aggregates`.
4. `seed.sql` (idempotent, keyed on stable slugs): profile, goal chain, habits, metrics with targets, weekday schedule templates from the doc, skill categories/skills/milestones/resources from the doc (Parts IV, V, XIII, XIV, XVI), north star text. Brayden reviews the seed file before it runs.
5. Generate TypeScript types (`supabase gen types`) into `/lib/supabase/types.ts`.
6. Unit tests for `/lib/dates.ts` (week boundaries in America/Denver across a DST change) — this is where subtle bugs live.

**Done when:** `supabase db push` applied; seed run; Table Editor shows seeded rows; a query from the app as your user returns them; a query with a second test user returns nothing (RLS check).
**Manual test:** none on phone; Brayden reads `seed.sql` and edits any goal/habit/target text he wants changed before it runs.
**What to understand:** what RLS is and why every table needs `user_id = auth.uid()`.

### Phase 2 — Today page
1. Server component loads today's `daily_entries`, `habit_logs`, `metric_logs`, active habits/metrics, the current week goal for the header.
2. Priority line: inline edit; link picker to a Week/Month goal; tap opens the trace-back chain (read-only list, deepest first).
3. Habit checkboxes: optimistic toggle, upsert `habit_logs`. Only habits scheduled for today's weekday appear.
4. Metric counters (`entry_mode = counter`): +1 / +5 / edit. Upsert `metric_logs`.
5. Daily review sheet: three text fields + the hours-type metrics (`entry_mode = daily_review`) as number inputs. Submit writes `daily_entries`, `metric_logs`, checks the "Daily review" habit, and pre-creates tomorrow's `daily_entries.priority_text` from "Tomorrow's #1".
6. Header strip: north star, quarter goal + bar, week score (placeholder "—" until Phase 5), streak (placeholder).
7. Empty states are one line of text, not illustrations.

**Done when:** you can run a full day in the app: set priority → check habits → count outbound → submit review → tomorrow's priority appears.
**Manual test:** do it for real for two days before Phase 3.
**What to understand:** optimistic UI — why the checkbox flips before the server confirms and what happens if the write fails.

### Phase 3 — Daily schedule (standalone)
1. `More → Schedule templates`: list per weekday, add/edit/delete blocks (time pickers in 15-min steps).
2. On first open of Today each day, materialize that weekday's template into `schedule_blocks` for today (idempotent — check for existing rows first).
3. Today: schedule section showing current + next block; expand to full-day list; edit/move/add/delete today's blocks; check a block done. "Save today as template" button.
4. Category color chips. Faith/Family and Rest blocks are visually protected (different border) — cosmetic reminder only, nothing enforced.

**Done when:** morning edit flow works in under 30 seconds on the phone.
**Manual test:** edit tomorrow's template, confirm it materializes correctly the next morning; DST is not in the window, but confirm times display in Denver time.
**What to understand:** `timestamptz` vs. local time — why blocks are stored in UTC and rendered in `America/Denver`.

### Phase 4 — Goals
1. Goals tab: tree view, collapsible by level, seeded chain visible.
2. Add/edit goal sheet: level, parent (constrained to the level above), title, target value/unit, dates, status.
3. Trace-back component (already used on Today) becomes the shared `GoalChain` component.
4. Quarter progress: manual % field plus auto = done child goals ÷ total child goals; show whichever the profile selects `[DECIDE default: auto]`.
5. Week goals list on the Week tab (read-only for now; Phase 5 makes review create them).

**Done when:** you can add a Week goal under the seeded Month goal and see it on Today's link picker.
**What to understand:** self-referencing tables (`parent_id`) and how a recursive CTE walks the chain.

### Phase 5 — Weekly scorecard, review gate, streak
`[DECIDE]` Metrics were cut 2026-09-05 (see §3.5) — ask Brayden how the weekly score should be defined from habit completion alone before writing `/lib/score.ts`; the steps below assume a metrics-based scorecard and need revisiting first.
1. `/lib/score.ts`: pure function `(habitStats, weights) → {score, breakdown, biggestIssue}`, mirroring `/lib/streaks.ts`'s pattern. Unit tests with edge cases (no habits active that week, zero-division).
2. Week tab: scorecard table of habit completion % per habit, plus the score with label. Prior weeks list with score + label.
3. Review flow: seven questions, saved as draft on every keystroke, submit → `weekly_reviews` row, `closed_at`, three next-week goals created from the "top 3" answer, streak recomputed = consecutive closed non-auto-closed weeks.
4. Gate: after Friday 5 PM local and before close, a full-screen card on app open; "Later" hides it for 2 hours (localStorage timestamp). Route `/week/review` always accessible.
5. Auto-close: a daily job (Phase 9's cron route) closes any week older than the current one that has no review, with `auto_closed = true`. Until Phase 9, a "Close unreviewed weeks" button in Settings does the same thing.
6. Today header now shows real score and streak.

**Done when:** a fake week of data produces the expected score in tests and on screen; submitting the review creates next week's goals; streak shows 1.
**Manual test:** run your first real Friday review in the app.
**What to understand:** why the score is a pure function with tests instead of SQL.

### Phase 6 — CRM + problem database
1. CRM tab: contacts list (search, filter by type, sort by follow-up date), overdue/today follow-up count badge.
2. Contact sheet: all fields; "Log interview" button.
3. Interview sheet: notes, pain score, current solution, estimated cost, would pilot, follow-up date (writes `contacts.follow_up_on` and `last_contact_on`), tag problems (multi-select existing or create new inline) with a per-problem pain score and optional quote.
4. Problems list: the doc's columns as an editable detail page; list sorted by mentions × avg pain from `problem_aggregates`.
5. Aggregation screen: problem · mentioned N · avg pain · % would pilot · industries. That's the "evidence, not intuition" view.
6. Today: "Follow-ups due: 3" line linking to the filtered CRM list.
7. Settings → Export CSV (contacts, interviews, problems).

**Done when:** log 3 fake interviews tagging 2 problems and the aggregation shows the right counts and averages.
**Manual test:** enter your real Q1 target list (orthodontists, DSOs, energy people) as contacts.
**What to understand:** many-to-many relationships (`interview_problems`) and why the aggregate is a view, not stored numbers.

### Phase 7 — Skill tree
1. More → Skills: categories with bar %, skills with 🔴🟡✅ status (derived: 0 milestones done = 🔴, some = 🟡, all = ✅).
2. Skill page: milestones (check requires a "proof" line), resources (kind, title, link, how to use it). Add/edit both.
3. Seeded content reviewed by Brayden in Phase 1's seed file; this phase only renders and edits it.

**Done when:** checking "Make 100 cold calls" with a proof moves the Sales bar; adding a resource does not.
**What to understand:** derived state — why status isn't stored in a column.

### Phase 8 — Idea parking lot
1. Floating "+" on every screen → 3-field sheet (idea, why, research later?).
2. More → Ideas: list by status. Status changes: parked → researched / killed / doing.
3. Monthly review prompt on Today from the 1st until all ideas created before that month have `reviewed_at` set for this month. `[DECIDE]`

**Done when:** add an idea from the Today screen in under 10 seconds; it does not appear anywhere until the 1st.

### Phase 9 — Push notifications + cron
1. Generate VAPID keys (`web-push generate-vapid-keys`); env vars `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.
2. `sw.js`: `push` event → `showNotification`; `notificationclick` → open the relevant route.
3. Settings → Notifications: "Enable on this device" button (must be a user tap; on iOS only works when launched from the home-screen icon `[VERIFY iOS ≥ 16.4]`), stores subscription in `push_subscriptions`; per-notification toggles saved to `profiles.notification_prefs`.
4. Route `POST /api/cron/tick` protected by `CRON_SECRET` header. Runs every hour: computes local time in `America/Denver`, sends whichever notifications are due that hour and not already sent (log to a `notification_log` table — migration `0003`), and auto-closes stale weeks.
5. Scheduling: `vercel.json` cron hourly. `[VERIFY]` Vercel Hobby cron limits at build time (historically daily-only with hour-level precision). If Hobby can't do hourly, use Supabase `pg_cron` + `pg_net` to POST to the same route every hour — same code, different trigger. Do not build a third path.
6. Test route `POST /api/push/test` sends a notification to the current device.

**Done when:** test notification arrives on the home-screen app with the screen locked; the 9:30 PM reminder fires on a real evening.
**Manual test:** wait for the first real Friday 5 PM notification.
**What to understand:** service workers run outside the page — why the push handler can't touch React state, and what VAPID actually proves.

### Phase 10 — Google Calendar two-way sync
This is the most fragile phase. Standalone schedule (Phase 3) must be in daily use first; if sync isn't worth it by then, skip this phase — nothing else depends on it.

**Brayden, before the session:** Google Cloud → new project → enable Google Calendar API → OAuth consent screen (External, add yourself as test user) → OAuth client (Web), redirect URI `https://<your-vercel-domain>/api/google/callback` and the localhost one. Env vars `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`. `[VERIFY]` While the consent screen is in "Testing", refresh tokens expire after 7 days; Claude checks the current Google policy and, if so, the fix is to publish the app (unverified is fine for a single personal user — you'll click through a warning once).

**Claude:**
1. Migration `0004_google.sql`: `google_tokens`.
2. `/api/google/connect` (OAuth start, scopes `calendar.events` + `calendar.readonly`, `access_type=offline`, `prompt=consent`) and `/api/google/callback` (store tokens). Settings → "Connect Google Calendar" / "Disconnect".
3. On connect: create a secondary calendar named "1B" and store its id. App blocks sync **only** to that calendar. Primary calendar is read-only in the app.
4. Push direction (app → Google): on create/update/delete of a `schedule_block` with `source != google`, upsert/delete the event on the "1B" calendar; store `google_event_id` + etag.
5. Pull direction (Google → app): on Today open and on the hourly cron, incremental sync using `syncToken` for both calendars. Primary events → `schedule_blocks` with `source = google` (read-only rows, rendered greyed). "1B" calendar events edited on Google → update the matching app block; deleted on Google → delete the block.
6. Conflict rule: last-modified wins by `updated` timestamp; log conflicts to console. No merge UI.
7. Manual "Sync now" button in Settings with last-sync time and last error.

**Done when:** create a block in the app → appears in Google within a minute; move it in Google Calendar on your phone → the app reflects it after Sync now; a class on your primary calendar shows in the day view greyed out.
**What to understand:** OAuth refresh tokens, and why sync uses `syncToken` instead of re-fetching everything.

### Phase 11 — Hardening
1. Offline: service worker caches the app shell so the Today page opens without signal; writes fail visibly (toast) rather than silently. No offline queue in v1.
2. Loading/error states on every data fetch. Sentry-free: errors go to `console.error` and a `Settings → Debug` page showing the last 20.
3. Lighthouse PWA + performance pass on the Today page (target: interactive < 2s on Slow 4G).
4. Backups: Settings → "Export everything" (JSON of all tables). Supabase free tier has no PITR; this is the backup.
5. README updated. Tag `v1.0`.

**Done when:** Brayden has used the app for 14 consecutive days and closed two weekly reviews without workarounds.

### Phase 2 features (after v1 is in daily use)
- **Decision journal + cooling timer:** decision, why, expected result, confidence %, alternatives, review date, actual outcome; amount field applies the doc's rule (<$500 free; $500–2.5k 24h lock; $2.5k–10k 72h + written why; >$10k memo + named person) and shows a countdown before "Committed" can be set. Calibration view: confidence vs. outcome over time.
- **AI coach:** one route that assembles context (goals, last 4 weeks of scores + reviews, last 10 interviews, problem aggregates, decisions) into a prompt with a system instruction to challenge, not encourage; chat UI on More. Provider key in env. No agents, no tools, no memory beyond the assembled context.
- **Monthly CEO review:** the doc's Company / Skills / Relationships / Money / Life questions, gated on the last day of the month like the weekly review.

---

## 7. Open items `[DECIDE]`

1. Auto-close at Monday 00:00 with streak reset — keep, or allow closing through Monday noon?
2. Problem `score /100`: manual, or computed from urgency + WTP + AI opportunity + access?
3. 4:00 PM "Uncomfortable rep" nudge — keep or drop?
4. Quarter progress default: auto from child goals, or manual %?
5. Service worker: hand-written `sw.js` (recommended) or Serwist?
6. Monthly idea review: gate on Today until done, or just a badge?
7. "Confirm email" on sign-up: off (matches Phase 0's original single-user setup) or on (recommended once `/signup` is public, so a bad email address can't hold an account)?

---

## 8. What to understand (filled in by Claude after each phase)

**Phase 0 —** A request for `/today` hits Vercel, which runs `proxy.ts` first. The proxy asks Supabase "who owns this cookie?" using the *anon* key; with no valid session it redirects to `/login` before any page code runs. On the login form, the browser posts to a Server Action (`app/login/actions.ts`) which calls `signInWithPassword` on the server and sets a session cookie. Every later page renders on the server with `createClient()` from `lib/supabase/server.ts`, which reads that cookie. The anon key can only do what Row Level Security allows for the logged-in user; the service-role key bypasses RLS entirely, so it never leaves the server (and isn't used until Phase 9). `manifest.json` + the `apple-mobile-web-app-*` meta tags are what make Safari's "Add to Home Screen" launch the app full-screen; `sw.js` is registered now so the browser already trusts it when push arrives in Phase 9.

**Multi-user (2026-09-04) —** `/signup` calls `supabase.auth.signUp()` from a Server Action, same pattern as `/login`'s `signInWithPassword()` — the browser never talks to Supabase directly, only through server-rendered forms. This did *not* touch the security model: the anon key is still public by design (it can't do anything on its own), and the service-role key is still untouched until Phase 9. What actually keeps User A from seeing User B's data is Row Level Security, landing in Phase 1 — every table's `user_id = auth.uid()` policy means a query only ever returns rows owned by whoever is logged in, regardless of which key made the request. `proxy.ts` now treats `/signup` like `/login`: reachable when logged out, redirects to `/today` when logged in. One open item: Supabase's "Confirm email" setting is still off from Phase 0's single-user setup — turn it on (Authentication → Settings) before this is truly public, or a stranger can register with an email they don't own.

**Phase 1 —** Row Level Security means every one of the 19 tables carries a policy that runs on *every* query: `user_id = auth.uid()` (profiles uses its own `id`, since that table is the auth user). Postgres injects this as a hidden `WHERE` clause, so a query never has to filter by user itself — the database refuses to return or write rows that aren't yours, even if the app code has a bug. This is what actually enforces "N independent accounts," not application logic. One gotcha this phase surfaced: the `on_auth_user_created` trigger that auto-creates a `profiles` row only fires for signups *after* the trigger exists — Brayden's own account predated it, so `0003_backfill_profiles.sql` had to backfill it, and `seed.sql` now upserts the profile instead of assuming the row is already there. `weekly_metric_totals` and `problem_aggregates` are views created `with (security_invoker = true)`, so they inherit the querying user's RLS instead of the view-owner's — without that flag a view silently bypasses RLS.

**Phase 2 —** Habit checkboxes use `useOptimistic` + `useTransition` (React 19 / Next 16's pattern, not the old `revalidatePath`): clicking flips the checkbox on the current frame via a local reducer, then the Server Action runs in the background and calls `refresh()` on success. If the write fails, the thrown error is forwarded to the nearest error boundary and the optimistic value reverts to the last real server-rendered prop — nothing was silently lost, since `habit_logs` was never written. Streaks are a second example of *derived state* (same idea as skill status in §3.7): there's no `current_streak` column anywhere — `/lib/streaks.ts` walks `habit_logs` backward from today, skipping days the habit isn't scheduled on (`days_of_week`), and stops at the first missed scheduled day. That's also why removing metrics 2026-09-05 was a same-day, low-risk change: nothing else in the schema depended on `metrics`/`metric_logs`, so dropping them was one migration, not a cascade of fixes.

**Phase 3 —** `schedule_templates.start_time`/`end_time` are plain `time` (no zone) — a floating "06:30" that means a different UTC instant depending which date it's materialized against (DST). `materializeTodaySchedule()` converts template rows to real `schedule_blocks.start_at`/`end_at` timestamptz once, the first time Today loads each day (a `count` check on today's date makes every later call a no-op — same idempotency shape as the profile backfill in Phase 1). Building that conversion (`lib/dates.ts`'s `localTimeToInstant`) surfaced a sharper version of the Phase 1 DST lesson: `date-fns-tz`'s `fromZonedTime` doesn't read a `Date`'s UTC fields, it reads whatever getters the *host* JS environment uses (`getFullYear`, `getHours`, ...) and reinterprets them as wall-clock time in the target zone — so the wall-clock `Date` must be built with the local constructor (`new Date(y, m, d, h, mi)`), never `Date.UTC`. A `Date.UTC`-built version passed every test on a UTC-configured machine and returned the *unconverted* input on a Denver-configured one; the dev shell here happens to run `America/Denver`, which is what caught it. "Save today as template" is the inverse conversion (`instantToLocalTimeString`) plus a full delete-and-reinsert of that weekday's template, not a diff — deliberately blunt so there's no merge logic to get wrong.

---

## 9. Change log

| Date | Change | By |
|---|---|---|
| 2026-09-04 | Initial plan | Claude + Brayden |
| 2026-09-04 | Phase 0 built. Dropped Google Fonts (network fetch at build time; system fonts render as SF on iPhone). `typecheck` script runs `next typegen` first so `PageProps`/`LayoutProps` globals exist. | Claude |
| 2026-09-04 | Reversed the "one user" decision: public self-serve `/signup` added, Supabase sign-ups re-enabled. Data isolation is unchanged — still RLS (`user_id = auth.uid()`) on every table, anon key stays public, service-role key still untouched until Phase 9. See §0. | Claude + Brayden |
| 2026-09-04 | Phase 1 built: `0001_core.sql` (19 tables + RLS), `0002_views.sql` (`weekly_metric_totals`, `problem_aggregates`), `0003_backfill_profiles.sql` (profile row for the pre-trigger account), `seed.sql`, `lib/dates.ts` + tests, `lib/supabase/types.ts`. §5's per-table specs didn't carry `user_id` into their `unique(...)` keys after the multi-user pivot — added it (`daily_entries`: `unique(user_id, date)`, `weekly_reviews`: `unique(user_id, week_start)`, plus new `unique` keys per table so `seed.sql` can be idempotent) so two users can't collide on the same date/slug. Supabase project region came up as `us-east-1`, not the "US West" from §Phase 0 — already created, not worth recreating over. | Claude |
| 2026-09-04 | Phase 2 built: `app/(app)/today/actions.ts` + `components/today/*` (Priority, Habits, Metrics, Daily review, Header). `lib/dates.ts` gained `getLocalWeekday`; both Supabase clients typed against `lib/supabase/types.ts`. | Claude |
| 2026-09-05 | Fixed production 404: the Vercel project's Framework Preset was "Other", so it served `public/` as a static site and never wired up the Next.js app. Added `vercel.json` (`"framework": "nextjs"`) to force it regardless of the dashboard setting. | Claude |
| 2026-09-05 | Cut metrics tracking from v1 entirely (Brayden's call) — habits only. `0004_drop_metrics.sql` drops `weekly_metric_totals`, `metric_logs`, `metrics`; removed from `seed.sql`, Today page, and PLAN.md (§0, §3.2, §3.5, §5). Added an "Add habit" control and per-habit streaks to Today — `/lib/streaks.ts` derives the current streak from `habit_logs` rather than storing one. Phase 5's weekly score needs a new, habit-only definition before it's built — flagged `[DECIDE]` in §3.5 and §6. | Claude + Brayden |
| 2026-09-05 | Phase 3 built: `more/schedule` (weekday template CRUD, `components/schedule/TemplateDay.tsx`), Today's schedule section (`components/today/ScheduleSection.tsx` — current+next collapsed, full-day expand, add/edit/delete, "Save today as template"), `materializeTodaySchedule()` in `today/actions.ts`. New `lib/schedule.ts` (materialize + current/next, both unit-tested) and `lib/categories.ts` (the 9 categories, dot colors, Faith/Family + Rest protected-border list — no schema change, tables already existed from Phase 1). `lib/dates.ts` gained `localTimeToInstant`/`instantToLocalTimeString`; building the first one caught a real bug (see §8) from `date-fns-tz`'s host-timezone-dependent `fromZonedTime`, worth remembering for any future local-time math. | Claude |
