import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// A minimal public "/" — not a marketing page (PLAN.md §3.1 still says no
// marketing pages, no onboarding tour) — exists only because Google's OAuth
// Branding verification requires a public home page that isn't gated behind
// login and states what the app does. Logged-in visitors skip straight to
// Today, same as before this existed.
export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/today");

  return (
    <main className="flex-1 flex flex-col justify-center px-6 pt-safe pb-safe">
      <div className="mx-auto w-full max-w-sm">
        <h1 className="text-4xl font-bold tracking-tight mb-1">1 Billion</h1>
        <p className="text-muted mb-6">The app is not the mission.</p>
        <p className="text-sm leading-relaxed mb-8">
          A personal founder OS: a daily planning chat and to-do list, goal tracking, a customer research CRM,
          and a weekly review — built to make execution happen, not to be the thing itself.
        </p>
        <div className="flex flex-col gap-3">
          <a
            href="/login"
            className="rounded-lg bg-accent text-black font-semibold py-3 text-base text-center active:opacity-80"
          >
            Sign in
          </a>
          <a
            href="/signup"
            className="rounded-lg border border-border py-3 text-base text-center active:opacity-80"
          >
            Sign up
          </a>
        </div>
      </div>
    </main>
  );
}
