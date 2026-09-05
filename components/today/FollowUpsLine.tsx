import Link from "next/link";

export default function FollowUpsLine({ count }: { count: number }) {
  if (count === 0) return null;

  return (
    <Link
      href="/crm?due=1"
      className="rounded-lg border border-border px-3 py-2 text-sm text-accent"
    >
      Follow-ups due: {count}
    </Link>
  );
}
