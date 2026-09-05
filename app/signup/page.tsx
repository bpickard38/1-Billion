import { signup } from "./actions";

const messages: Record<string, string> = {
  missing: "Email and password required.",
  short: "Password must be at least 8 characters.",
  mismatch: "Passwords don't match.",
  failed: "Could not create account. Try a different email.",
};

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { error } = await searchParams;
  const message = typeof error === "string" ? messages[error] : undefined;

  return (
    <main className="flex-1 flex flex-col justify-center px-6 pt-safe pb-safe">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-4xl font-bold tracking-tight mb-1">1 Billion</h1>
        <p className="text-muted mb-8">Create your account.</p>

        <form action={signup} className="flex flex-col gap-3">
          <input
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            placeholder="Email"
            required
            className="rounded-lg bg-surface border border-border px-4 py-3 text-base outline-none focus:border-accent"
          />
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Password"
            required
            className="rounded-lg bg-surface border border-border px-4 py-3 text-base outline-none focus:border-accent"
          />
          <input
            name="confirm"
            type="password"
            autoComplete="new-password"
            placeholder="Confirm password"
            required
            className="rounded-lg bg-surface border border-border px-4 py-3 text-base outline-none focus:border-accent"
          />
          {message && <p className="text-bad text-sm">{message}</p>}
          <button
            type="submit"
            className="mt-2 rounded-lg bg-accent text-black font-semibold py-3 text-base active:opacity-80"
          >
            Create account
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          Already have an account?{" "}
          <a href="/login" className="text-accent">
            Sign in
          </a>
        </p>
      </div>
    </main>
  );
}
