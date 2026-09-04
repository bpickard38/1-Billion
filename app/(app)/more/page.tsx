import PageTitle from "@/components/PageTitle";
import { logout } from "@/app/login/actions";

export default function MorePage() {
  return (
    <>
      <PageTitle>More</PageTitle>
      <p className="text-muted mb-8">Skills, Ideas, Schedule and Settings arrive in later phases.</p>
      <form action={logout}>
        <button type="submit" className="text-bad text-sm">
          Sign out
        </button>
      </form>
    </>
  );
}
