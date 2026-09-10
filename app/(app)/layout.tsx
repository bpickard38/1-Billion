import TabBar from "@/components/TabBar";
import WeeklyReviewGate from "@/components/week/WeeklyReviewGate";
import { DEFAULT_TIMEZONE } from "@/lib/dates";
import { getProfile } from "@/lib/supabase/profile";
import { getCurrentWeekScore } from "@/app/(app)/week/actions";

// Every screen inside (app) requires a logged-in user. proxy.ts enforces
// this on every request (redirects to /login before this layout ever
// runs) — checking again here would be a second network round trip to
// Supabase Auth on every navigation for no added protection.
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const [profile, weekScore] = await Promise.all([
    getProfile(),
    getCurrentWeekScore(),
  ]);

  return (
    <div className="flex-1 flex flex-col min-h-full">
      <main className="flex-1 px-4 pt-safe pb-24">{children}</main>
      <TabBar />
      <WeeklyReviewGate
        weekStart={weekScore.weekStart}
        timeZone={profile?.timezone ?? DEFAULT_TIMEZONE}
        isClosed={weekScore.closed}
      />
    </div>
  );
}
