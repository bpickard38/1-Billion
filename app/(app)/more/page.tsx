import Link from "next/link";
import PageTitle from "@/components/PageTitle";
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
      <p className="text-muted mb-8">Skills, Ideas and Settings arrive in later phases.</p>
      <form action={logout}>
        <button type="submit" className="text-bad text-sm">
          Sign out
        </button>
      </form>
    </>
  );
}
