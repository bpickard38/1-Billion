export const metadata = { title: "Privacy Policy — 1 Billion" };

export default function PrivacyPage() {
  return (
    <main className="flex-1 px-6 py-10 pt-safe pb-safe">
      <div className="mx-auto w-full max-w-2xl flex flex-col gap-6 text-sm leading-relaxed">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Privacy Policy</h1>
          <p className="text-muted">Last updated 2026-09-10.</p>
        </div>

        <p>
          1 Billion (&quot;the app&quot;) is a personal productivity tool. This page explains what data it
          collects and how that data is used.
        </p>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">What we collect</h2>
          <p>
            An account (email + password) via Supabase Auth, and whatever you enter into the app
            yourself: to-dos, goals, daily schedule and planning chat, weekly reviews, CRM
            contacts and interview notes, problem-database entries, ideas, and skill-tree progress.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Google Calendar data</h2>
          <p>
            If you choose to connect Google Calendar, the app reads your primary calendar and
            creates or updates calendar events when you save schedule blocks or approve a plan.
            This access
            is used solely to power that sync feature inside the app. Google Calendar data is never
            sold, shared with third parties, or used for advertising, and is used only in the ways
            described here and in the app itself, in line with Google&apos;s{" "}
            <a
              href="https://developers.google.com/terms/api-services-user-data-policy"
              className="text-accent underline"
            >
              API Services User Data Policy
            </a>
            , including its Limited Use requirements. Disconnecting Google Calendar (Settings →
            Google Calendar → Disconnect) revokes this access immediately.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Canvas and AI planning</h2>
          <p>If you connect BYU Canvas, the app stores your access token encrypted and imports selected courses&apos; assignment titles, descriptions, due dates, links, and submission status. It only reads Canvas data. Disconnecting removes the saved token and imported assignments; calendar blocks you approved remain.</p>
          <p>When you request AI estimates, selected assignment titles and descriptions and the tasks you type are sent to OpenAI. Your Canvas token and Google Calendar events are not sent to AI. Estimates are stored for planning and can be edited. Scheduling times are calculated by the app, and calendar blocks are added only after approval.</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">How your data is used</h2>
          <p>
            Solely to run the app for you: showing your own data back to you, computing streaks
            and scores, sending the notifications you&apos;ve enabled, and syncing your calendar if
            connected. Your data is never sold, and never shared with third parties except the
            infrastructure providers that host the app (Supabase for the database, Vercel for
            hosting, Google if you connect Google Calendar, Canvas if you connect it, and OpenAI when you request AI estimates).
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Data isolation and security</h2>
          <p>
            Every account&apos;s data is isolated at the database level (Postgres Row Level Security) —
            no user&apos;s data is ever visible to another user, and no manual database query can bypass
            that isolation for normal application access.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Deleting your data</h2>
          <p>
            To delete your account and all associated data, email the contact address below. Data
            is deleted within 30 days of a verified request.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Children</h2>
          <p>1 Billion is not directed at, and is not knowingly used by, anyone under 13.</p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Changes</h2>
          <p>
            This policy may be updated as the app changes. Material changes will update the &quot;Last
            updated&quot; date above.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Contact</h2>
          <p>bpickard38@gmail.com</p>
        </section>
      </div>
    </main>
  );
}
