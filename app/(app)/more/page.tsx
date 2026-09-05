import Link from "next/link";
import PageTitle from "@/components/PageTitle";
import CloseUnreviewedWeeksButton from "@/components/more/CloseUnreviewedWeeksButton";
import ExportCsvButtons from "@/components/more/ExportCsvButtons";
import { logout } from "@/app/login/actions";

export default function MorePage() {
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
      </nav>
      <p className="text-muted mb-2">Ideas arrive in a later phase.</p>

      <p className="mb-2 mt-6 text-xs uppercase tracking-wide text-muted">Settings</p>
      <div className="mb-8 flex flex-col gap-2">
        <CloseUnreviewedWeeksButton />
        <ExportCsvButtons />
      </div>

      <form action={logout}>
        <button type="submit" className="text-bad text-sm">
          Sign out
        </button>
      </form>
    </>
  );
}
