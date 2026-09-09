export const metadata = { title: "Terms of Service — 1 Billion" };

export default function TermsPage() {
  return (
    <main className="flex-1 px-6 py-10 pt-safe pb-safe">
      <div className="mx-auto w-full max-w-2xl flex flex-col gap-6 text-sm leading-relaxed">
        <div>
          <h1 className="text-2xl font-bold tracking-tight mb-1">Terms of Service</h1>
          <p className="text-muted">Last updated 2026-09-08.</p>
        </div>

        <p>
          1 Billion (&quot;the app&quot;) is a personal productivity tool. By creating an account, you agree
          to these terms.
        </p>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">The service</h2>
          <p>
            The app is provided as-is, without warranty of any kind. It&apos;s actively developed and
            may change, break, or be unavailable at times. It is not a substitute for professional
            financial, medical, or legal advice.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Your account</h2>
          <p>
            You&apos;re responsible for the accuracy of the data you enter and for keeping your login
            credentials secure. You may delete your account and data at any time by contacting the
            address below.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Acceptable use</h2>
          <p>
            Don&apos;t use the app to store or process anyone else&apos;s personal data without their
            knowledge, or in any way that violates applicable law.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Google Calendar integration</h2>
          <p>
            Connecting Google Calendar is optional and can be disconnected at any time from
            Settings. Use of that integration is also subject to Google&apos;s own terms for your
            account.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Termination</h2>
          <p>
            You may stop using the app and delete your account at any time. Accounts may be
            suspended for abuse, unlawful use, or a security threat to the service or other users.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-base font-semibold">Changes</h2>
          <p>
            These terms may be updated as the app changes. Material changes will update the &quot;Last
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
