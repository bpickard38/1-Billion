# BYU Canvas and daily/weekly planning

Implemented for this personal app: read-only BYU Canvas imports, editable effort estimates, optional OpenAI estimation, daily/next-seven-days previews, approval, Google sync retry, and undo. Goal coaching remains a later phase.

The "Plan my day" flow (days=1) is now a conversational chat instead of a checkbox form — see "Daily planning chat" below. "Plan the next 7 days" (Canvas assignment auto-scheduling) is unchanged.

## One-time server setup

1. Apply `supabase/migrations/0012_canvas_planner.sql` and `0013_todos_and_planning_chat.sql` to the same Supabase project as the app, after migrations 0001–0011. No live migration was applied during implementation.
2. Add `CANVAS_TOKEN_ENCRYPTION_KEY` to the server environment. Generate 32 random bytes as 64 hexadecimal characters, for example with `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Keep the key stable across deployments. Changing it requires reconnecting Canvas. Do not prefix it with `NEXT_PUBLIC_`.
3. For AI estimates and the daily planning chat, add `OPENAI_API_KEY` and `OPENAI_MODEL` to the server environment. Set a model available to your API account that supports Responses structured outputs. Durations can be entered manually until these are configured; the daily chat shows "AI is not connected yet" until they are.
4. Redeploy/restart the app after configuring the environment. Existing Supabase and Google environment settings still apply.
5. After migration, regenerate Supabase types with `npm run db:types`. The temporary companion schemas in `lib/planning-database.ts` (0012) and `lib/app-database.ts` (0013: `todos`, `planning_chat_messages`) describe the new tables for local checks before the live database is updated.

## Daily planning chat (habits and the priority field are gone)

Habits, habit check-ins, and the "#1 priority today" field were removed 2026-09-21 (migration `0013_todos_and_planning_chat.sql`). Today now has a plain to-do list instead — item 1 (lowest `sort`) is the priority. The list is normally filled in by chatting through "Plan my day":

1. Open Today → **Plan today**, or Schedule → **Plan my day**.
2. The assistant asks what today should look like; reply in plain language (what you want to get done, anything already fixed in time). It asks at most one short follow-up at a time.
3. Once it has enough, it proposes a to-do list (ordered) and, optionally, time blocks. Tap **Add to my day** to write them — to-dos are appended to today's list, blocks go through the same confirm/undo path (and Google sync) as the 7-day planner, so a conflicting time is rejected with a clear error instead of silently overlapping something.
4. Keep chatting afterward (e.g. "swap the gym block to 6pm") — each ready proposal is independent; only the one you confirm gets written.
5. The weekly score (Today's "This week" card, `/week/review`) is now to-dos done ÷ to-dos created that week, replacing the old habit-completion score. The per-row breakdown is by day (Mon, Tue, ...) instead of by habit.

## Connect your token

1. On https://byu.instructure.com, open Account → Settings → New Access Token.
2. Purpose: `1B assignment planner`. Choose an expiration within BYU's 90-day maximum shown in your token dialog.
3. In this app open Settings → Canvas assignments. Paste the token into the password field and connect. Do not paste it in a chat or commit it to the repository.
4. Choose courses and click **Save courses and refresh assignments**.
5. Open Today → Daily Schedule → Plan my day. Select assignments and use **Ask AI to estimate tasks**, or enter durations yourself. Review the proposed schedule and approve.
6. Weekly review and Schedule both link to **Next 7 days**. Existing planned/completed sessions are subtracted from an assignment's total effort.

The app only makes GET requests to BYU Canvas. A personal Canvas token may have broader permissions; its Purpose label does not restrict those permissions. This personal-token setup is for the owner's project. A multi-user rollout needs institution-approved OAuth instead of collecting other users' personal tokens.

## Behavior and limits

- Canvas refresh is explicit, not a background job. Refresh before planning to catch new deadlines/submissions. Missing or deselected assignments are hidden, and imported estimates survive refresh. Scheduled work and Canvas submission state stay separate.
- Selected assignment descriptions and typed task requests go to OpenAI only when you ask for estimates. Tokens and Google events are never included. AI estimates effort; deterministic code fits work around commitments and leaves break gaps.
- Overdue work is shown as unplanned, and work without a due date is allowed. Imported assignments never have their Canvas deadline changed.
- Approval is a database transaction: stale/overlapping proposals fail without partial inserts. Repeated approvals reuse the same draft. Google writes use stable event IDs to prevent duplicate events on retry. A Google event can still change between the last refresh and save; there is no transaction spanning Google and Supabase.
- The current schedule editor is a today view. The seven-day planner lists all proposed future sessions; connected users can also view/edit them in Google Calendar.
- Disconnecting deletes the stored token and imported assignments, but keeps approved calendar events. Revoke the token in Canvas separately if you want to invalidate it entirely.
- No API keys, personal Canvas token, or live database credentials were present in this checkout. Live Canvas/AI requests and deployment require setup above.

## Verification

Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build`. Tests include Canvas pagination/host checks, deadline and timezone scheduling, and isolated PostgreSQL checks of confirmation and account isolation. The database tests use PGlite in memory; they do not contact Supabase.

Implementation checks: all 53 tests passed, type checking and lint passed, and the production build passed using temporary build-only Supabase placeholders and generated VAPID keys. An unconfigured build initially stopped at the existing push-notification route because its VAPID settings were absent. The temporary values were not saved. No authenticated browser walkthrough or live Canvas/OpenAI call was performed.

Manual smoke test after setup: connect BYU, import selected courses, check a due date against Canvas, estimate a task, adjust minutes, preview, approve, verify Google, retry without duplicates, then undo. Repeat with the seven-day view and an assignment already partly planned.

References: [Canvas authentication](https://canvas.instructure.com/doc/api/file.oauth.html), [assignments](https://canvas.instructure.com/doc/api/assignments.html), [pagination](https://canvas.instructure.com/doc/api/file.pagination.html), [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs).
