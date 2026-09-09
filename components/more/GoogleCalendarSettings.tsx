"use client";

import { useTransition } from "react";
import { disconnectGoogle } from "@/app/(app)/more/google/actions";

export default function GoogleCalendarSettings({
  connected,
  error,
}: {
  connected: boolean;
  error: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-1">
      {connected ? (
        <>
          <p className="text-sm text-good">Google Calendar connected.</p>
          <button
            type="button"
            onClick={() => startTransition(() => disconnectGoogle())}
            disabled={isPending}
            className="rounded-lg border border-border px-3 py-2 text-left text-sm disabled:opacity-50"
          >
            {isPending ? "Disconnecting..." : "Disconnect Google Calendar"}
          </button>
        </>
      ) : (
        <a href="/api/google/connect" className="block rounded-lg border border-border px-3 py-2 text-left text-sm">
          Connect Google Calendar
        </a>
      )}
      {error && <p className="text-xs text-bad">{error}</p>}
    </div>
  );
}
