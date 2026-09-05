import Link from "next/link";
import PageTitle from "@/components/PageTitle";
import CloseUnreviewedWeeksButton from "@/components/more/CloseUnreviewedWeeksButton";
import { logout } from "@/app/login/actions";

export default function MorePage() {
  return (
    <>
      <PageTitle>More</PageTitle>
      <nav className="mb-6 flex flex-col gap-2">
        <Link href="/more/schedule" className="rounded-lg border border-border px-3 py-2 text-sm">
          Schedule templates
        </Link>
      </nav>
      <p className="text-muted mb-2">Skills and Ideas arrive in later phases.</p>

      <p className="mb-2 mt-6 text-xs uppercase tracking-wide text-muted">Settings</p>
      <div className="mb-8 flex flex-col gap-2">
        <CloseUnreviewedWeeksButton />
      </div>

      <form action={logout}>
        <button type="submit" className="text-bad text-sm">
          Sign out
        </button>
      </form>
    </>
  );
}
