# 1 BILLION — Implementation Plan

Personal Founder OS. Web app + PWA saved to iPhone home screen.

> The app is not the mission. The app exists to make me execute the mission.

This file lives at the root of the repo as `PLAN.md`. Claude reads it at the start of every session and works on exactly one phase at a time. Edit anything here before a phase starts. Anything marked `[DECIDE]` is a choice you can flip; anything marked `[VERIFY]` is something Claude must confirm at build time rather than assume.

---

## 0. Decisions already made

| Item | Decision |
|---|---|
| v1 features | Today page, habits (with per-habit streaks), daily schedule (editable, Google Calendar two-way sync), goal hierarchy (Dream → Month → Week → Today), weekly review gate + streak, skill tree (flat list, manual status), iPhone web push. Daily/weekly metrics tracking was cut 2026-09-05 — the app is habit-only. The CRM + problem database, idea parking lot, and skill milestones/resources sub-model were cut 2026-09-08 (simplification pass, see change log) — the app was accumulating small-SaaS scope creep instead of staying a daily execution tool. |
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
Bottom tab bar, 4 tabs: **Today · Schedule · Week · More** (revised 2026-09-08 simplification pass — CRM tab cut, Goals folded into More; previously revised 2026-09-05 to promote Schedule from a Today widget to its own tab, see §3.3). "More" holds Goals, Skills, Schedule templates, Settings. Dark theme default. No marketing pages, no onboarding tour.

### 3.2 Today (home screen)
Top to bottom, nothing else:
- Header strip: NORTH STAR one-liner · this month's goal with progress bar · current week score · streak ("12 weeks"). (Was "quarter" before the 2026-09-08 goal-level collapse, §3.4.)
- **#1 Priority today** — one line, editable, linked to a goal (tap → trace-back chain up to the Dream).
- **Schedule** — check-off only: today's current + next time block, each with a done checkbox. No add/edit/delete here — that's the **Schedule** tab (§3.3).
- **Habits** — checkboxes, each showing its current streak (consecutive scheduled days completed, derived from `habit_logs`). Default set: Spiritual study, Workout, Deep work, Customer/outbound work, Technical learning, Read, Uncomfortable rep, Daily review. An "Add habit" control lets Brayden add more from the page.
- **Daily review** button (evening): three fields — What did I accomplish? What did I learn? Tomorrow's #1 task. Submitting it (a) sets tomorrow's #1 Priority, (b) checks the "Daily review" habit.

(The CRM follow-ups line and idea-review card that used to sit here were cut 2026-09-08 along with those modules — see change log.)

Rule: the page must load and be usable in under 2 seconds on LTE. No charts on this page.

### 3.3 Daily schedule
- A **template per weekday** seeded from the doc (Mon CEO/Sales, Tue Customers+Product, Wed Build, Thu Sell, Fri Strategy, Sat Deep Development, Sun protected) on the doc's daily skeleton (6:30 wake → 10:30 sleep). Edited under **More → Schedule templates**.
- Each morning, today's blocks are materialized from the template (once, idempotent). Edits to today never change the template unless "Save as template" is tapped.
- **Schedule tab** (revised 2026-09-05, ahead of the original phase order, at Brayden's request — anticipates the Phase 10 Google Calendar look): a Google-Calendar-style day view — hourly rows, scrollable, tap an empty hour slot to add a block, tap a block to edit or delete it. Today only for now; no date navigation yet. Blocks have a category: Faith/Family, Health, School, Startup-Customers, Startup-Build, Startup-Strategy, Learning, Racing, Rest — each with a dot/tint color, and Faith/Family + Rest get a protected left border (cosmetic only).
- Two-way Google Calendar sync (Phase 10): app blocks live directly on your primary Google calendar (revised 2026-09-10 — originally a dedicated "1B" calendar, at Brayden's request). Ownership of a primary-calendar event is decided per-event, not per-calendar: app-created events carry a marker Google lets any app attach to its own events, so the app can tell its own blocks apart from your real personal events (classes, meetings), which stay read-only inside the day view. A block can repeat on chosen weekdays via a real Google Calendar recurring series (not the app's separate per-weekday schedule-template system, §3.3 above) — editing or deleting one offers "this event" vs "all events," same as Google Calendar's own recurrence UI (no "this and following," a deliberate scope cut).

### 3.4 Goals
Levels: Dream → Month → Week → Today (collapsed from 8 levels — Dream → 10-year → 3-year → 1-year → Quarter → Month → Week → Today — in the 2026-09-08 simplification pass; the intermediate horizons are prose context, not tracked rows, unless daily use later proves otherwise). Reachable from **More → Goals**, not its own tab (also 2026-09-08). Each goal has a parent, title, optional metric target (e.g. "20 interviews"), status, and dates. Views:
- Tree view (collapsible).
- Trace-back: from any goal or the Today priority, show the full chain up to the Dream.
- Progress bar (any level with children) = % of child goals with `status = done`. Auto only, decided 2026-09-05 — no manual override.

Seeded chain: Build a billion-dollar company → 20 interviews this month (validating one painful vertical workflow; Q1: 30–40 healthcare + 15–20 energy interviews) → 5 interviews this week → today's action.

### 3.5 Week (scorecard + review)
- Week runs Monday → Sunday.
- **Score (decided 2026-09-05, habit-only since metrics were cut):** overall completion % — total habit-days done ÷ total habit-days scheduled that week, across every active habit combined. Habits scheduled more days/week count for more of the score; there's no per-habit importance weighting. Pure function `lib/score.ts#computeWeekScore`, unit-tested. Labels: 90%+ Excellent, 75-89% Strong, 50-74% Uneven, <50% Rough.
- **Biggest issue** (replaces the old metric-based line): the active habit with the lowest completion % that week, e.g. "Uncomfortable rep (40%)" — `null` if every habit hit 100%.
- **Friday review gate.** From Friday 5:00 PM local until the week closes, opening the app shows a full-screen "Weekly Review Required" card (dismissable for 2 hours at a time so you can still log things — a localStorage timestamp keyed by week, not a server flag). Seven questions: accomplished / failed / why / what customers taught me / wasted time on / biggest bottleneck / next week's top 3. Submitting closes the week, freezes the score, auto-creates next week's three Week-level goals (one per non-blank line of the top-3 answer), and the streak (derived, not stored — same pattern as habit streaks) becomes consecutive closed non-auto-closed weeks. `[DECIDE]` (still open — Phase 9 territory) At Monday 00:00 an unreviewed week auto-closes with its score and the streak resets to 0; until Phase 9's cron exists, More → Settings → "Close unreviewed weeks" does this manually, on demand, looking back up to 52 weeks.
- Week detail (`/week/review`) shows the review answers and score breakdown once closed; the form itself is the always-accessible route the gate's "Start review" button sends you to.

### 3.6 CRM + problem database — cut 2026-09-08
Removed entirely (simplification pass — Brayden's call: not earning its complexity for daily execution). Contacts/interviews/problems data was exported to CSV before the tables were dropped (`supabase/migrations/0008_simplify.sql`). What this section used to describe: contacts (name, company, industry, role, type, contact info, notes), interviews linked to a contact with pain score/would-pilot/follow-up, a 16-column problem-scoring table, an aggregation view sorted by mentions × avg pain, and CSV export. May come back later if customer-research volume actually demands structured tracking — until then, use notes.

### 3.7 Skill tree — simplified 2026-09-08
- Categories seeded from the doc: Sales, Product, Technology, AI Engineering, Finance, Leadership, Communication (+ Racing Engineering as a side tree).
- Each skill has one manual status: 🔴 not started / 🟡 in progress / ✅ proven, set directly from the list — no separate milestones or research-resources sub-model (both dropped 2026-09-08; nothing in the schema linked "studying a resource" to progress anyway, so dropping resources lost no behavior).
- Category rollup = count of proven skills ÷ total skills in that category.

### 3.8 Idea parking lot — cut 2026-09-08
Removed entirely (simplification pass — not part of the daily execution loop). Existing ideas were exported to CSV before the table was dropped. Use a notes app for stray ideas until the core loop (priority → habits → schedule → review) is solid enough to justify bringing this back.

### 3.9 Notifications (web push, iPhone)
- 6:45 AM: "Set today's ONE thing." (if #1 Priority is empty)
- 4:00 PM weekdays: "Uncomfortable rep done?" (if habit unchecked) `[DECIDE]`
- 9:30 PM: "Daily review." (if not submitted)
- Friday 5:00 PM: "Weekly Review Required."
All times in `America/Denver`; each notification has an on/off toggle in Settings. (CRM follow-up reminders at 8:00 AM were cut with the CRM, 2026-09-08 — see §3.6.)

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
| `profiles` | timezone (default America/Denver), week_start (mon), score_weights jsonb (unused — Phase 5's habit-only score is a fixed formula, not configurable per profile), north_star text, notification_prefs jsonb |
| `goals` | level (dream/month/week/today — collapsed from 8 levels 2026-09-08), parent_id, title, description, target_value, target_unit, current_value, status (active/done/dropped), starts_on, ends_on, sort |
| `habits` | name, days_of_week int[] (1–7), sort, active. Streaks are derived from `habit_logs`, not stored — see `/lib/streaks.ts`. |
| `habit_logs` | habit_id, date, done — unique(habit_id, date) |
| `daily_entries` | date, priority_text, priority_goal_id, accomplished, learned, tomorrow_priority, submitted_at — unique(user_id, date) |
| `weekly_reviews` | week_start date, answers jsonb (7 keys), score numeric, breakdown jsonb, biggest_issue text, closed_at, auto_closed bool — unique(user_id, week_start) |
| `schedule_templates` | weekday int, start_time, end_time, title, category, sort |
| `schedule_blocks` | date, start_at timestamptz, end_at, title, category, done, source (template/manual/google/google_primary), google_event_id, google_etag, google_recurring_event_id, recurrence_days (int[], denormalized per-instance for the repeat picker) |
| `skill_categories` | name, sort, is_side_tree |
| `skills` | category_id, name, sort, status (not_started/in_progress/proven — added 2026-09-08, replacing the milestones/resources sub-model) |
| `push_subscriptions` | endpoint (unique), p256dh, auth, user_agent |
| `google_tokens` | refresh_token, access_token, expires_at, calendar_id ("primary" — revised 2026-09-10, was a dedicated "1B" calendar), primary_sync_token, last_synced_at, last_sync_error |

`contacts`, `interviews`, `problems`, `interview_problems`, `ideas`, `skill_milestones`, `skill_resources`, and the `problem_aggregates` view were dropped 2026-09-08 (`supabase/migrations/0008_simplify.sql`) along with the CRM, idea parking lot, and skill milestones/resources — see §3.6–3.8 and the change log. Score math lives in `/lib/score.ts` (TypeScript), not SQL, so it's unit-testable — same pattern as `/lib/streaks.ts` for habit streaks.

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
Built 2026-09-05. `[DECIDE]` resolved before writing code — score is overall habit completion % (see §3.5), no per-habit weighting.
1. `/lib/score.ts`: pure `computeWeekScore(habitStats) → {score, label, breakdown, biggestIssue}` and `computeReviewStreak(closedWeekStarts, currentWeekStart) → number`, mirroring `/lib/streaks.ts`'s pattern. Unit tests with edge cases (no habits active that week, zero-division, gaps/auto-closed weeks breaking the streak) — tested across `TZ=UTC`/`America/Denver`/`Asia/Tokyo`.
2. Week tab: current week's live scorecard (habit completion % per habit, overall score + label, biggest issue) if not yet closed, or the frozen closed row if it is. Prior closed weeks list with score + label. Week-level goals list (from Phase 4) kept.
3. Review flow (`/week/review`): seven questions, draft-saved 800ms after the last keystroke (not literally every keystroke — debounced to avoid a request per key) via `saveReviewDraft`; submit → `submitReview` writes the frozen `weekly_reviews` row, creates next week's Week-level goals (one per non-blank line of the top-3 answer, parented under the current active Month goal), disambiguating on the rare `unique(user_id, level, title)` collision by appending the week's date and retrying once.
4. Gate (`components/week/WeeklyReviewGate.tsx`, mounted in `app/(app)/layout.tsx` so it shows app-wide): after Friday 5 PM local and before close, a full-screen card; "Later" hides it for 2 hours (localStorage, keyed by week so old dismissals don't leak into the next week). Never shows on `/week/review` itself, which stays reachable regardless.
5. Auto-close: no Phase 9 cron yet, so More → Settings → "Close unreviewed weeks" (`closeUnreviewedWeeks`) does it on demand, looking back up to 52 weeks and skipping any week that already has a closed row.
6. Today header now shows real score and streak, via `getCurrentWeekScore()` — the same function the Week tab and the layout's gate check call, so all three never disagree.

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

### Phase 11 — Simplify (built 2026-09-08)
Steve-Jobs-style product review: the app had grown into a small SaaS product (19 tables, 6 tabs, 10+ screens, a 16-field CRM contact form, a 16-field problem scorecard) when its only job is daily execution. Brayden reviewed each secondary module directly and decided what to cut.
1. Cut the CRM + problem database entirely (`contacts`, `interviews`, `problems`, `interview_problems`, `problem_aggregates`) — real Q1 contact data was exported to CSV first. Removed the `/crm` tab and routes, `FollowUpsLine` on Today, the CRM follow-up push notification, and CSV export buttons.
2. Cut the idea parking lot entirely (`ideas` table, `/more/ideas`, the floating add-idea button, `IdeaReviewCard` on Today) — data exported to CSV first.
3. Simplified the skill tree: dropped `skill_milestones`/`skill_resources`, added a manual `skills.status` (not_started/in_progress/proven) set directly from the flat list. Category bar = proven ÷ total skills.
4. Collapsed the goal hierarchy from 8 levels to 4 (Dream → Month → Week → Today); reparented existing goals up past the dropped levels before tightening the `goals.level` check constraint. Folded the Goals tab into More.
5. Bottom nav down to 4 tabs: Today, Schedule, Week, More.

**Done when:** `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` all pass; nav shows 4 tabs; `/crm` and `/more/ideas` are gone; Today shows only header/priority/schedule/habits/daily-review; Goals reachable from More with the 4-level hierarchy; Skills page shows a flat list with a working status dropdown.
**Manual test:** confirm on the phone that the 4-tab nav, trimmed Today page, and Skills status dropdown all work; confirm existing habits/schedule/week-review data was untouched by the migration.
**What to understand:** see §8.

### Phase 12 — Hardening
1. Offline: service worker caches the app shell so the Today page opens without signal; writes fail visibly (toast) rather than silently. No offline queue in v1.
2. Loading/error states on every data fetch. Sentry-free: errors go to `console.error` and a `Settings → Debug` page showing the last 20.
3. Lighthouse PWA + performance pass on the Today page (target: interactive < 2s on Slow 4G).
4. Backups: Settings → "Export everything" (JSON of all tables). Supabase free tier has no PITR; this is the backup.
5. README updated. Tag `v1.0`.

**Done when:** Brayden has used the app for 14 consecutive days and closed two weekly reviews without workarounds.

### Phase 2 features (after v1 is in daily use)
- **Decision journal + cooling timer:** decision, why, expected result, confidence %, alternatives, review date, actual outcome; amount field applies the doc's rule (<$500 free; $500–2.5k 24h lock; $2.5k–10k 72h + written why; >$10k memo + named person) and shows a countdown before "Committed" can be set. Calibration view: confidence vs. outcome over time.
- **AI coach:** one route that assembles context (goals, last 4 weeks of scores + reviews, decisions) into a prompt with a system instruction to challenge, not encourage; chat UI on More. Provider key in env. No agents, no tools, no memory beyond the assembled context. (Interviews/problem-aggregates context dropped from this description 2026-09-08 along with the CRM — revisit if it comes back.)
- **Monthly CEO review:** the doc's Company / Skills / Relationships / Money / Life questions, gated on the last day of the month like the weekly review.

---

## 7. Open items `[DECIDE]`

1. ~~Auto-close at Monday 00:00 with streak reset — keep, or allow closing through Monday noon?~~ Decided 2026-09-08 (Phase 9): keep, at Monday 00:00 local per user's timezone — `app/api/cron/tick/route.ts`'s `autoCloseStaleWeeks`.
2. ~~Problem `score /100`: manual, or computed from urgency + WTP + AI opportunity + access?~~ Moot — the `problems` table was dropped 2026-09-08 (Phase 11 simplification).
3. ~~4:00 PM "Uncomfortable rep" nudge — keep or drop?~~ Decided 2026-09-08 (Phase 9): keep, shipped as-is.
4. ~~Quarter progress default: auto from child goals, or manual %?~~ Decided 2026-09-05: auto only, no manual override. `lib/goals.ts`'s `computeProgressPct`. (The "quarter" level itself was later dropped 2026-09-08 — same auto-only rule now applies to the Month level.)
5. Service worker: hand-written `sw.js` (recommended) or Serwist?
6. ~~Monthly idea review: gate on Today until done, or just a badge?~~ Decided 2026-09-05: a dismissable card, not a full-screen gate. Moot — the idea parking lot was cut entirely 2026-09-08 (Phase 11 simplification).
7. "Confirm email" on sign-up: off (matches Phase 0's original single-user setup) or on (recommended once `/signup` is public, so a bad email address can't hold an account)?

---

## 8. What to understand (filled in by Claude after each phase)

**Phase 0 —** A request for `/today` hits Vercel, which runs `proxy.ts` first. The proxy asks Supabase "who owns this cookie?" using the *anon* key; with no valid session it redirects to `/login` before any page code runs. On the login form, the browser posts to a Server Action (`app/login/actions.ts`) which calls `signInWithPassword` on the server and sets a session cookie. Every later page renders on the server with `createClient()` from `lib/supabase/server.ts`, which reads that cookie. The anon key can only do what Row Level Security allows for the logged-in user; the service-role key bypasses RLS entirely, so it never leaves the server (and isn't used until Phase 9). `manifest.json` + the `apple-mobile-web-app-*` meta tags are what make Safari's "Add to Home Screen" launch the app full-screen; `sw.js` is registered now so the browser already trusts it when push arrives in Phase 9.

**Multi-user (2026-09-04) —** `/signup` calls `supabase.auth.signUp()` from a Server Action, same pattern as `/login`'s `signInWithPassword()` — the browser never talks to Supabase directly, only through server-rendered forms. This did *not* touch the security model: the anon key is still public by design (it can't do anything on its own), and the service-role key is still untouched until Phase 9. What actually keeps User A from seeing User B's data is Row Level Security, landing in Phase 1 — every table's `user_id = auth.uid()` policy means a query only ever returns rows owned by whoever is logged in, regardless of which key made the request. `proxy.ts` now treats `/signup` like `/login`: reachable when logged out, redirects to `/today` when logged in. One open item: Supabase's "Confirm email" setting is still off from Phase 0's single-user setup — turn it on (Authentication → Settings) before this is truly public, or a stranger can register with an email they don't own.

**Phase 1 —** Row Level Security means every one of the 19 tables carries a policy that runs on *every* query: `user_id = auth.uid()` (profiles uses its own `id`, since that table is the auth user). Postgres injects this as a hidden `WHERE` clause, so a query never has to filter by user itself — the database refuses to return or write rows that aren't yours, even if the app code has a bug. This is what actually enforces "N independent accounts," not application logic. One gotcha this phase surfaced: the `on_auth_user_created` trigger that auto-creates a `profiles` row only fires for signups *after* the trigger exists — Brayden's own account predated it, so `0003_backfill_profiles.sql` had to backfill it, and `seed.sql` now upserts the profile instead of assuming the row is already there. `weekly_metric_totals` and `problem_aggregates` are views created `with (security_invoker = true)`, so they inherit the querying user's RLS instead of the view-owner's — without that flag a view silently bypasses RLS.

**Phase 2 —** Habit checkboxes use `useOptimistic` + `useTransition` (React 19 / Next 16's pattern, not the old `revalidatePath`): clicking flips the checkbox on the current frame via a local reducer, then the Server Action runs in the background and calls `refresh()` on success. If the write fails, the thrown error is forwarded to the nearest error boundary and the optimistic value reverts to the last real server-rendered prop — nothing was silently lost, since `habit_logs` was never written. Streaks are a second example of *derived state* (same idea as skill status in §3.7): there's no `current_streak` column anywhere — `/lib/streaks.ts` walks `habit_logs` backward from today, skipping days the habit isn't scheduled on (`days_of_week`), and stops at the first missed scheduled day. That's also why removing metrics 2026-09-05 was a same-day, low-risk change: nothing else in the schema depended on `metrics`/`metric_logs`, so dropping them was one migration, not a cascade of fixes.

**Phase 3 —** `schedule_templates.start_time`/`end_time` are plain `time` (no zone) — a floating "06:30" that means a different UTC instant depending which date it's materialized against (DST). `materializeTodaySchedule()` converts template rows to real `schedule_blocks.start_at`/`end_at` timestamptz once, the first time Today loads each day (a `count` check on today's date makes every later call a no-op — same idempotency shape as the profile backfill in Phase 1). Building that conversion (`lib/dates.ts`'s `localTimeToInstant`) surfaced a sharper version of the Phase 1 DST lesson: `date-fns-tz`'s `fromZonedTime` doesn't read a `Date`'s UTC fields, it reads whatever getters the *host* JS environment uses (`getFullYear`, `getHours`, ...) and reinterprets them as wall-clock time in the target zone — so the wall-clock `Date` must be built with the local constructor (`new Date(y, m, d, h, mi)`), never `Date.UTC`. A `Date.UTC`-built version passed every test on a UTC-configured machine and returned the *unconverted* input on a Denver-configured one; the dev shell here happens to run `America/Denver`, which is what caught it. "Save today as template" is the inverse conversion (`instantToLocalTimeString`) plus a full delete-and-reinsert of that weekday's template, not a diff — deliberately blunt so there's no merge logic to get wrong.

**Schedule tab (2026-09-05, same day as Phase 3) —** The day-grid (`components/schedule/DayCalendar.tsx`) positions each block with plain math, not a layout library: `top = (minutesSinceMidnight / 60) * HOUR_HEIGHT`, `height = (durationMinutes / 60) * HOUR_HEIGHT`, inside one `position: relative` div holding 24 absolutely-positioned hour rows and one absolutely-positioned block per row. `lib/dates.ts` gained `localMinutesSinceMidnight` for this — same host-timezone trap as `localTimeToInstant` (§ above), so it was tested across `TZ=UTC`/`America/Denver`/`Asia/Tokyo` before anything was built on top of it, not just on the dev machine's own zone. Tapping an hour row and tapping a block hit two different, overlapping absolutely-positioned `<button>`s at the same screen point — with same-position siblings (not nested elements), the browser's hit-test already resolves to whichever one paints on top (later in DOM order), so no manual z-index or click-priority logic was needed, just rendering blocks after rows.

**Phase 4 —** `goals.parent_id` self-references the same table, so `GoalTree.tsx` builds the whole tree client-side from one flat query with a single pass: a `Map<parent_id, Goal[]>` grouping, then a recursive `GoalNode` component that looks up its own children by its own `id`. The Today priority's trace-back and the Goals tree's per-node "Path to Dream" needed the same walk — from any goal, follow `parent_id` up to the Dream — but from different starting points: Today only has one linked goal id and nothing else loaded, so `lib/goals.ts`'s `getGoalChain` queries the DB one hop at a time (still fine at 8 levels max, no recursive CTE needed); the Goals tree already has every goal in memory from the tree query, so `buildChainFromMap` does the identical walk over a `Map` instead, zero extra queries. Both feed the same `components/goals/GoalChain.tsx` for rendering — one shared component, two different ways of getting it the data, chosen by what each caller already has on hand. Progress bars are the same *derived, not stored* pattern as habit streaks and skill status: `computeProgressPct` takes a done-count and a total and is pure/unit-tested, so the same function prices Today's quarter bar (via two `count`-only queries) and every node in the Goals tree (via `Array.filter` on already-loaded children) without either one needing to know how the other got its numbers.

**Phase 5 —** The score is a pure function, not a SQL view, for the same reason `/lib/streaks.ts` and `/lib/goals.ts`'s progress math are: `computeWeekScore(habitStats)` takes plain `{scheduledDays, doneDays}` per habit and returns `{score, label, breakdown, biggestIssue}` with zero I/O, so every edge case (no active habits, a habit scheduled zero days, every habit at 100%) is a one-line assertion instead of a fixture-laden integration test against Postgres — and the exact same function scores a live in-progress week, a just-submitted week, and a 52-week-old auto-close pass, because all three just build the same `habitStats` shape from different date ranges and hand it to the identical calculation. The streak is *derived, not stored* like habit streaks and goal progress: there's no `weekly_reviews.streak` column, `computeReviewStreak` walks backward from the current week through a `Set` of already-closed week_starts, and "current week isn't closed yet" doesn't break or count it — the exact same shape as `computeHabitStreak`'s "today not done yet" rule, because it's the same underlying idea (a currently-open period shouldn't retroactively break a streak that isn't over). The trickiest real bug risk wasn't the math — it was `goals`' `unique(user_id, level, title)` constraint from Phase 1, written for idempotent seeding, colliding with review-generated Week goals that reuse a common phrase across different weeks; rather than a migration to loosen it (which would have needed `seed.sql`'s `ON CONFLICT` targets rewritten too, and NULL `starts_on` on higher-level goals makes a clean fix non-trivial), `submitReview` just catches Postgres's `23505` and retries once with the week's date appended to the title.

**Phase 6 —** `interview_problems` is the many-to-many join between interviews and problems: one interview can tag several problems, and one problem (e.g. "no-show scheduling") gets mentioned across many separate interviews with different contacts, each with its own pain score and quote — a plain foreign key on either table couldn't represent that, only a join table with its own two FKs can. `problem_aggregates` (created in Phase 1's `0002_views.sql`) is a SQL view, not a column on `problems`, for the same reason `weekly_metric_totals` and every derived-state case so far has been (habit streaks, goal progress, the week score): `times_mentioned`/`avg_pain_score`/`pilot_pct` are all just aggregates over `interview_problems` joined back through `interviews` to `contacts` for industry — recomputing them on every read means they can never drift out of sync with the underlying rows, at the cost of a join instead of a stored number. Logging an interview does three writes in sequence inside one Server Action (`logInterview` in `app/(app)/crm/actions.ts`) rather than one query: insert the interview, then for each tagged problem either insert a new `problems` row or catch Postgres's `23505` unique-violation and look up the existing one by title (same pattern Phase 5's `submitReview` used for goal-title collisions), then insert one `interview_problems` row per tag — there's no single SQL statement that can conditionally insert-or-find across two different tables and then insert a third, so the boring sequential version is the right one, not a bug to fix. CSV export (`lib/csv.ts`) runs entirely client-side once the Server Action hands back a plain string: a `Blob` + `URL.createObjectURL` + a synthetic `<a download>` click, so there's no `/api` route or file storage involved for something this small.

**Phase 7 —** Skill status (🔴/🟡/✅) and a category's progress bar are both *derived, not stored* — the same pattern as habit streaks, goal progress, and the week score: `statusEmoji` in `components/skills/CategoryList.tsx` just looks at `done`/`total` milestone counts fetched fresh from `skill_milestones`, and the category bar reuses Phase 4's `computeProgressPct(done, total)` unchanged, now aggregating milestones across every skill in the category instead of child goals — the same pure function prices two different trees because both are just "done count ÷ total count." Studying a resource never moves the bar because resources and milestones are separate tables with no foreign key between them; nothing links a `skill_resources` row to "progress" at all. Checking a milestone requires a proof line by construction, not validation-after-the-fact: `MilestoneEditor`'s Save button is `disabled` whenever `done && !proof.trim()`, so there's no path through the UI that writes `done = true` with an empty `proof` — the one thing worth getting right on write is `done_at`, which `upsertMilestone` only refreshes to "now" the first time a milestone flips to done (it re-reads the existing row first) so re-saving an already-proven milestone's title doesn't quietly rewrite when it was actually proven.

**Phase 8 —** The idea list stays invisible everywhere except the two places the plan names (Add-idea sheet and More → Ideas) by construction, not by a filter: nothing on Today or elsewhere queries `ideas` at all except `getIdeasToReview`, and that query itself only returns rows once a real calendar boundary has passed (`created_at` before this month's start) — so a brand-new idea structurally cannot appear in the review card the same month it was captured, matching "does not appear anywhere until the 1st" without a feature flag or a status check. That query is also this phase's second use of a plain `date` (well, `timestamptz` here) getting compared against a *local* month boundary — `getMonthStartDateString` (new in `lib/dates.ts`) resolves "the 1st" in the profile's timezone, then `localTimeToInstant(monthStart, "00:00", timezone)` converts that wall-clock instant to UTC before it ever touches a `.lt()`/`.gte()` filter, the same two-step Phase 3 and Phase 5 needed — a raw `` `${monthStart}T00:00:00Z` `` string would silently reinterpret Denver's midnight as UTC's midnight, off by 6-7 hours. `updateIdeaStatus` (day-to-day status changes on the Ideas list) and `reviewIdea` (the monthly review sheet) are two separate Server Actions that both just update the same `status` column, because only one of them is allowed to also stamp `reviewed_at` — collapsing them into one function with an "is this a review?" flag would make that distinction invisible at every call site instead of obvious from which function is imported.

**Phase 9 —** `sw.js`'s push handler runs in the service worker's own context, not the page's — it never touches React state, it just calls `self.registration.showNotification()` off whatever JSON `web-push` sent, and `notificationclick` finds-or-opens a client window itself since no page script is listening. The hourly trigger is Supabase pg_cron + pg_net (`supabase/migrations/0006_cron_schedule.sql`), not `vercel.json`'s cron, because Vercel Hobby caps cron jobs at once/day (confirmed live via search, not assumed) — pg_cron's `net.http_post` hits the same `/api/cron/tick` route hourly instead, reading `CRON_SECRET` from Supabase Vault at call time so the value never touches a committed file. `notification_log`'s `unique(user_id, kind, sent_for, ref_id)` is a claim-before-send lock, not an after-the-fact log: the cron route inserts that row *before* calling `web-push`, and a `23505` conflict on the insert is the signal to skip sending — so a retried or overlapping tick can't double-notify, no mutex needed. Because the cron route has no user session, it's the first code in the app to use `lib/supabase/admin.ts`'s service-role client, which means — unlike every RLS-scoped Server Action so far — it has to filter every query by `user_id` itself; its `computeUserWeekScore` duplicates Phase 5's scoring wrapper rather than importing it, specifically because the two need different filtering (RLS vs. explicit `user_id`) — PLAN.md's "no abstraction until the third repetition" rule, applied literally. VAPID's keypair is what lets the push services (Apple's, for iOS Safari) trust that a notification actually came from this server: the private key signs a JWT per-send, so losing it would let someone else push to your users — it was generated once and written straight to `.env.local` without ever being printed to chat or committed.

**Phase 10 (Google Calendar sync) —** The push and pull directions run through completely different code shapes because they have completely different trust models: push (app → "1B" calendar) is a synchronous call inside `upsertScheduleBlock`/`deleteScheduleBlock` — a user just made this edit, so failure just means "not synced yet," logged and swallowed rather than blocking the save. Pull (Google → app) uses `syncToken` incremental sync, which trades a real constraint for real cheapness: Google will only honor a `syncToken` scoped to the same query bounds (window/calendar) it was issued from, so the first sync per calendar has to run a bounded `timeMin`/`timeMax` fetch (30 days) before a token exists at all, and a `410` mid-sync means the token expired and the only recovery is dropping it and re-running that same bounded fetch — there's no partial-repair path. The two calendars needed genuinely different handling, not just different IDs: primary is read-only in this app, so every pulled event becomes (or updates) a `schedule_blocks` row with `source = 'google_primary'`, rendered greyed with no tap-to-edit; the "1B" calendar is the one place a `schedule_blocks` row's `updated_at` and a Google event's `updated` timestamp can genuinely disagree about which version is current, since both sides can write it — resolved by "whichever timestamp is newer wins," logged to console on the losing side, no merge UI, per the phase's own spec. Category survives the round trip through Google's `extendedProperties.private.app_category`, a small private key-value bag Google Calendar carries on every event for exactly this "the source app needs to remember something Google doesn't model" case — without it, an event edited in Google and pulled back would lose its category every time. `schedule_blocks.category`/`.source` stayed plain `check`-constrained `text` (not a real Postgres enum) specifically so adding `'Google'`/`'google_primary'` in `0009_google_sync.sql` was an `alter constraint`, not a type migration — the same tradeoff Phase 1 made deliberately (§5).

**Phase 11 (Simplify) —** Cutting a table cleanly means finding every place its *rows* implied behavior elsewhere, not just deleting the `create table` — the CRM cut also had to remove a push-notification kind (`followup_reminder` in `lib/notifications.ts`) and a Today section (`FollowUpsLine`), and the idea cut had to remove its own push-adjacent card (`IdeaReviewCard`) and the floating add button mounted in the app-wide layout; none of those were in the tables themselves. Reparenting goals past a dropped level needed a *loop*, not a single `UPDATE`: `0008_simplify.sql`'s do-block repeatedly points every goal at `parent.parent_id` wherever the parent sits at a dropped level, and `exit when not found` stops once a pass touches zero rows — one pass only fixes one hop, so a goal that was 3 dropped levels deep (e.g. under the old Quarter, itself under 1yr, itself under 3yr) needs 3 passes to reach a surviving ancestor. Postgres names an unnamed column `check` constraint `<table>_<column>_check` by default (`goals_level_check` here) — worth knowing before trying to `alter table ... drop constraint` on one your migration didn't name explicitly. `lib/supabase/types.ts` is a generated file; it was briefly hand-edited to match `0008_simplify.sql` so the code could typecheck before the migration was pushed to Supabase, then replaced with a real `npm run db:types` run once `supabase db push` applied `0008` for real — a reminder that the generated file and the live schema can drift apart on purpose for a short window, but should never stay that way past the same session.

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
| 2026-09-05 | Revised Phase 3's schedule UI same-day, at Brayden's request — he wants it to look and feel like Google Calendar ahead of the Phase 10 sync. Promoted Schedule from a Today widget to its own **tab** (bottom nav is now 6, not 5 — see §3.1); added `app/(app)/schedule` with `components/schedule/DayCalendar.tsx`, a scrollable hourly day-grid: tap an empty hour to add a block, tap a block to edit/delete (`components/schedule/BlockEditor.tsx`, extracted from the old inline editor and reused by the calendar). Today's `ScheduleSection.tsx` was cut down to check-off only (current + next block, done toggle, no add/edit) with a link to the new tab, per Brayden's explicit split ("keep today with the check off"). `lib/dates.ts` gained `localMinutesSinceMidnight` (tested across `TZ=UTC`/`America/Denver`/`Asia/Tokyo`, given the `fromZonedTime` scare from the same morning). `lib/categories.ts` gained per-category block background/border classes for calendar event cards. No new migration, no new Server Actions — the calendar reuses `today/actions.ts`'s existing `upsertScheduleBlock`/`deleteScheduleBlock`/`saveTodayAsTemplate`. | Claude + Brayden |
| 2026-09-05 | Phase 4 built: Goals tab (`components/goals/GoalTree.tsx` — collapsible tree, per-node progress %, "Path to Dream" toggle; `GoalEditor.tsx` — add/edit sheet with parent constrained to the level above), `app/(app)/goals/actions.ts` (`upsertGoal`). New `lib/goals.ts` (`GOAL_LEVELS`/`LEVEL_LABEL`, `getGoalChain` + `buildChainFromMap`, `computeProgressPct`, all but the DB-walking one unit-tested) and shared `components/goals/GoalChain.tsx`, now used by both the Goals tree and Today's `PriorityCard.tsx` (which previously had its own copy of the chain list + level labels — removed). Week tab got a read-only week-goals list. Resolved the §7 `[DECIDE]`: quarter/parent progress is auto-only (done children ÷ total), no manual-% override, no migration or profile setting added — Brayden's call, picked the simpler of the two options offered. | Claude + Brayden |
| 2026-09-05 | Phase 5 built: weekly score (`lib/score.ts` — `computeWeekScore`, `computeReviewStreak`, both pure/unit-tested), resolving §3.5's `[DECIDE]` — overall habit completion % (frequency-weighted by construction, no separate importance weights), Brayden's pick over a per-habit-average alternative. Week tab now shows the live current-week scorecard (or the frozen row once closed) plus a prior-closed-weeks list; `/week/review` (new route) is the seven-question form, draft-saved 800ms after the last keystroke, submit creates next week's Week goals from the "top 3" line-by-line. Full-screen Friday-5PM gate (`components/week/WeeklyReviewGate.tsx`, mounted app-wide in `app/(app)/layout.tsx`) uses a ref + direct DOM `hidden` toggle instead of React state, since visibility depends on `localStorage` and wall-clock time — both unknowable at SSR time, so a state-based approach would either hydration-mismatch or need to fix itself via a same-render `setState` in an effect, which is exactly the anti-pattern the newer `react-hooks/set-state-in-effect` lint rule catches (hit this same class of bug fixing `ScheduleSection`/`DayCalendar` in Phase 3 too — the ref-toggle approach avoids it structurally instead of patching around it). `lib/dates.ts` gained `isAfterWeeklyReviewCutoff`, tested across `TZ=UTC`/`America/Denver`/`Asia/Tokyo`. Today's header now shows real score/streak via a new shared `getCurrentWeekScore()` (`app/(app)/week/actions.ts`), also used by the Week tab and the layout's gate check, so the three can't disagree. `[DECIDE]` for Monday-00:00 auto-close is still open (Phase 9) — "Close unreviewed weeks" under More → Settings is the manual stand-in. No migration — `weekly_reviews` already existed from Phase 1. | Claude + Brayden |
| 2026-09-05 | Phase 6 built: CRM tab rewritten (`components/crm/ContactList.tsx` — client-side search/type-filter/follow-ups-due toggle, sort by follow-up date; `ContactEditor.tsx` — full-field sheet with a "Log interview" button; `InterviewSheet.tsx` — notes/pain score/cost/would-pilot/follow-up plus multi-select problem tagging with per-tag pain score + quote, existing or inline-created), `app/(app)/crm/actions.ts` (`upsertContact`, `logInterview`, `upsertProblem`, `getFollowUpDueCount`, three `export*Csv` actions). New `/crm/problems` (list from the Phase-1 `problem_aggregates` view, sorted by mentions × avg pain) and `/crm/problems/[id]` (`components/crm/ProblemForm.tsx`, the doc's full column set, editable). Today gained `FollowUpsLine` (only renders when contacts are due, links to `/crm?due=1`); More → Settings gained `ExportCsvButtons` (contacts/interviews/problems, client-side `Blob` download, no new API route). New `lib/csv.ts` (`toCsv`, unit-tested — the third CSV export justified pulling the escaping logic out once instead of three times). No migration — `contacts`/`interviews`/`problems`/`interview_problems`/`problem_aggregates` all already existed from Phase 1. | Claude |
| 2026-09-05 | Phase 7 built: More → Skills (`components/skills/CategoryList.tsx` — collapsible categories with a `computeProgressPct` bar, skills listed with a derived 🔴/🟡/✅ status) and `/more/skills/[id]` (`MilestoneList`/`MilestoneEditor` — proof required to check a milestone off, Save disabled until it's filled in; `ResourceList`/`ResourceEditor` — kind/title/link/how-to-use). `app/(app)/more/skills/actions.ts` (`upsertMilestone`, `upsertResource`). No migration, no seed changes — `skill_categories`/`skills`/`skill_milestones`/`skill_resources` and all seeded content came from Phase 1. | Claude |
| 2026-09-05 | Phase 8 built: `components/ideas/AddIdeaButton.tsx` (floating "+" mounted app-wide in `app/(app)/layout.tsx`, 3-field sheet: idea, why interesting, research later?) and More → Ideas (`components/ideas/IdeasList.tsx`, grouped by status with a per-row status select). `app/(app)/more/ideas/actions.ts` (`addIdea`, `updateIdeaStatus`, `reviewIdea`, `getIdeasToReview`). Today gained `IdeaReviewCard` — a dismissable card, not a full gate (resolves §7's `[DECIDE]`), showing a one-at-a-time review sheet for parked ideas created before this calendar month that haven't been reviewed this month; deciding an idea's fate there is the only path that stamps `reviewed_at`, kept as a separate `reviewIdea` action from the Ideas list's plain `updateIdeaStatus` so ordinary status changes never masquerade as a monthly review. `lib/dates.ts` gained `getMonthStartDateString`, unit-tested including a year-boundary case and a non-Denver zone. No migration — `ideas` already existed from Phase 1. | Claude |
| 2026-09-08 | Phase 9 built: `public/sw.js` gained `push`/`notificationclick` handlers; More → Notifications (`components/more/PushNotificationSettings.tsx` — enable/disable on this device, per-kind toggles, send-test button) and `app/(app)/more/notifications/actions.ts` (`subscribePush`, `unsubscribePush`, `setNotificationPref`). `app/api/cron/tick/route.ts` (hourly: sends due notifications per §3.9, deduped via `notification_log`, auto-closes stale weeks at Monday 00:00 local) and `app/api/push/test/route.ts`. VAPID keys generated via `web-push generate-vapid-keys` and written straight to `.env.local`/Vercel, never shown in chat. `supabase/migrations/0006_cron_schedule.sql` schedules pg_cron + pg_net to hit `/api/cron/tick` hourly — confirmed via search that Vercel Hobby cron caps at once/day, so `vercel.json` couldn't do this directly (§6 Phase 9 step 5's documented fallback); `CRON_SECRET` is read from Supabase Vault at call time (Brayden ran a one-time `vault.create_secret(...)` himself in the SQL Editor — Claude never saw the value). `lib/dates.ts` gained `getLocalHour`, unit-tested. Resolved §7 items 1 and 3 (Monday-00:00 auto-close, 4 PM nudge) — both shipped as originally specced. Some of this phase's groundwork (migration `0005`, `lib/notifications.ts`, `lib/supabase/admin.ts`, `lib/web-push.d.ts`) landed in an earlier same-day commit message `"d"` rather than a proper `phase N` message — noted here since that history won't self-explain later. | Claude + Brayden |
| 2026-09-09 | Phase 10 built (both slices — slice 1's OAuth connect flow, `app/api/google/connect`+`callback`, `0007_google.sql`, had landed earlier without a change-log entry; this covers the remaining sync work). `lib/google.ts`: push (`syncBlockToGoogle`/`deleteBlockFromGoogle`, called from `today/actions.ts`'s `upsertScheduleBlock`/`deleteScheduleBlock`, best-effort/non-blocking) and pull (`syncGoogleCalendarForUser`, incremental via `syncToken` for both calendars, `410` handled by dropping the token and refetching a bounded 30-day window). `0009_google_sync.sql` adds `'google_primary'` to `schedule_blocks.source` and `'Google'` to `.category`, plus a partial unique index on `(user_id, google_event_id)` for the pull's upserts. Pull-sync is anchored to the Schedule tab's page load (not "Today," per the original phase text) and the hourly cron, since the day view — and its read-only primary-calendar overlay — lives on Schedule; Today stays check-off-only per §3.2's under-2s budget. `components/schedule/DayCalendar.tsx` renders `source = 'google_primary'` blocks read-only/greyed, no tap-to-edit. Settings gained a "Sync now" button plus last-synced-at/last-error display (`syncGoogleCalendarNow` in `more/google/actions.ts`). Verified via `npm run typecheck`/`lint`/`test`/`build` (all green) and a live smoke test against the already-connected account — real OAuth refresh, `events.list` against both calendars with `nextSyncToken` returned, and an insert/get/delete round-trip confirming `extendedProperties.private.app_category` survives — but not a full browser click-through (no login credentials available in-session), so the phase's own manual test (create a block → appears in Google; move one in Google → app reflects it after Sync now; a primary-calendar class shows greyed in the day view) is still Brayden's to run. | Claude |
| 2026-09-10 | Schedule tab: fixed short blocks' time text getting clipped (blocks under 36px now show one "9:00 AM Title" line instead of a stacked title+time that didn't fit), tightened block padding, and added press-and-drag rescheduling (mouse drags immediately; touch needs a ~350ms hold first, via the Pointer Events API — see `components/schedule/DayCalendar.tsx`). A dragged block calls the existing `upsertScheduleBlock`, defaulting to `editScope: "this"` for a block that's part of a series (§ below). | Claude |
| 2026-09-10 | Google Calendar sync revised at Brayden's request: (1) writes/reads now happen directly on the primary calendar instead of a dedicated "1B" one — `0011_primary_calendar_and_recurrence.sql` sets `calendar_id = 'primary'`, drops the now-unneeded `onebillion_sync_token` column; `lib/google.ts`'s single `syncPrimaryCalendar` decides per-event ownership by whether it carries the app's `extendedProperties.private.app_category` marker, not by which calendar it's on — nothing had been pushed to the old "1B" calendar yet, so there was no data to migrate. (2) Added Google-native recurring events ("repeat on weekdays," real RRULE, not the app's separate per-weekday `schedule_templates` system) — `BlockEditor.tsx` gained a weekday picker; `lib/google.ts#createRecurringSeries` inserts a master event with a `BYDAY` RRULE and materializes its instances locally right away via `events.instances()`, `updateSeriesAll`/`deleteRecurringSeries` handle "all events" edits/deletes, and editing/deleting a single occurrence without touching the day picker offers "this event" vs "all events" (no "this and following" — a deliberate scope cut, chosen over the full Google Calendar semantics to keep this a single session's work). `schedule_blocks` gained `google_recurring_event_id` (the series' master id, shared by every instance) and `recurrence_days` (denormalized per row, purely so the editor can pre-populate its picker without an extra Google fetch). Caught via a live smoke test before it ever shipped: a recurring event's `start`/`end` needs an explicit IANA `timeZone` alongside `dateTime` — Google rejects a bare UTC instant with "Missing time zone definition for start time" for recurring events specifically, silently accepted for one-off ones, so `next build` alone wouldn't have caught it. | Claude + Brayden |
| 2026-09-08 | Phase 11 (Simplify) built, out of order ahead of Phase 10's remaining sync work, at Brayden's request via a `/plan`-mode product review styled on "what would Steve Jobs cut." Cut CRM + problem database (`contacts`/`interviews`/`problems`/`interview_problems`/`problem_aggregates`, `app/(app)/crm/**`, `components/crm/**`, `FollowUpsLine`, the CRM push-notification kind, `lib/csv.ts`) and the idea parking lot (`ideas`, `app/(app)/more/ideas/**`, `components/ideas/**`, `IdeaReviewCard`) — both exported to CSV first via the app's own (since-removed) export buttons. Simplified the skill tree: dropped `skill_milestones`/`skill_resources` in favor of a manual `skills.status` column, driven from a `<select>` in the flattened `CategoryList.tsx`. Collapsed `goals.level` from 8 values to 4 (dream/month/week/today) — `0008_simplify.sql` reparents any goal whose parent sits at a dropped level up to its nearest surviving ancestor (looped until stable) before tightening the check constraint, so no orphaned rows or manual data surgery was needed. Bottom nav: `components/TabBar.tsx` down to 4 tabs (Goals moved to a More link). Brayden confirmed the CRM/ideas CSV export was done from the still-live app before `0008_simplify.sql` was pushed (`supabase db push`); `lib/supabase/types.ts` was then regenerated for real (`npm run db:types`) against the live post-migration schema. Renumbered the old "Phase 11 — Hardening" to Phase 12. | Claude + Brayden |
