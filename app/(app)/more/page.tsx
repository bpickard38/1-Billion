import Link from "next/link";
import PageTitle from "@/components/PageTitle";
import CloseUnreviewedWeeksButton from "@/components/more/CloseUnreviewedWeeksButton";
import PushNotificationSettings from "@/components/more/PushNotificationSettings";
import GoogleCalendarSettings from "@/components/more/GoogleCalendarSettings";
import { logout } from "@/app/login/actions";
import { getNotificationPrefs } from "@/app/(app)/more/notifications/actions";
import { createClient } from "@/lib/supabase/server";

export default async function MorePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [notificationPrefs, { google_error }, supabase] = await Promise.all([
    getNotificationPrefs(),
    searchParams,
    createClient(),
  ]);
  const { data: googleTokens } = await supabase
    .from("google_tokens")
    .select("id, last_synced_at, last_sync_error")
    .maybeSingle();
  const googleError = typeof google_error === "string" ? google_error : null;

  return (
    <>
      <PageTitle>Settings</PageTitle>
      <nav className="mb-6 flex flex-col gap-2">
        <Link href="/more/canvas" className="rounded-lg border border-border px-3 py-2 text-sm">Canvas assignments</Link>
        <Link href="/goals" className="rounded-lg border border-border px-3 py-2 text-sm">
          Goals
        </Link>
        <Link href="/more/schedule" className="rounded-lg border border-border px-3 py-2 text-sm">
          Schedule templates
        </Link>
      </nav>

      <p className="mb-2 text-xs uppercase tracking-wide text-muted">Week</p>
      <div className="mb-6 flex flex-col gap-2">
        <CloseUnreviewedWeeksButton />
      </div>

      <p className="mb-2 text-xs uppercase tracking-wide text-muted">Notifications</p>
      <div className="mb-6">
        <PushNotificationSettings initialPrefs={notificationPrefs} />
      </div>

      <p className="mb-2 text-xs uppercase tracking-wide text-muted">Google Calendar</p>
      <div className="mb-8">
        <GoogleCalendarSettings
          connected={Boolean(googleTokens)}
          error={googleError}
          lastSyncedAt={googleTokens?.last_synced_at ?? null}
          lastSyncError={googleTokens?.last_sync_error ?? null}
        />
      </div>

      <form action={logout}>
        <button type="submit" className="text-bad text-sm">
          Sign out
        </button>
      </form>
    </>
  );
}
