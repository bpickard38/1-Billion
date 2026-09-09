import Link from "next/link";
import PageTitle from "@/components/PageTitle";
import CloseUnreviewedWeeksButton from "@/components/more/CloseUnreviewedWeeksButton";
import ExportCsvButtons from "@/components/more/ExportCsvButtons";
import PushNotificationSettings from "@/components/more/PushNotificationSettings";
import { logout } from "@/app/login/actions";
import { getNotificationPrefs } from "@/app/(app)/more/notifications/actions";

export default async function MorePage() {
  const notificationPrefs = await getNotificationPrefs();

  return (
    <>
      <PageTitle>More</PageTitle>
      <nav className="mb-6 flex flex-col gap-2">
        <Link href="/more/skills" className="rounded-lg border border-border px-3 py-2 text-sm">
          Skills
        </Link>
        <Link href="/more/schedule" className="rounded-lg border border-border px-3 py-2 text-sm">
          Schedule templates
        </Link>
        <Link href="/crm/problems" className="rounded-lg border border-border px-3 py-2 text-sm">
          Problem database
        </Link>
        <Link href="/more/ideas" className="rounded-lg border border-border px-3 py-2 text-sm">
          Ideas
        </Link>
      </nav>

      <p className="mb-2 mt-6 text-xs uppercase tracking-wide text-muted">Settings</p>
      <div className="mb-6 flex flex-col gap-2">
        <CloseUnreviewedWeeksButton />
        <ExportCsvButtons />
      </div>

      <p className="mb-2 text-xs uppercase tracking-wide text-muted">Notifications</p>
      <div className="mb-8">
        <PushNotificationSettings initialPrefs={notificationPrefs} />
      </div>

      <form action={logout}>
        <button type="submit" className="text-bad text-sm">
          Sign out
        </button>
      </form>
    </>
  );
}
