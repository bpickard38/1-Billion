"use client";

import { useTransition } from "react";
import { disconnectGoogle, syncGoogleCalendarNow } from "@/app/(app)/more/google/actions";

export default function GoogleCalendarSettings({
  connected,
  error,
  lastSyncedAt,
  lastSyncError,
}: {
  connected: boolean;
  error: string | null;
  lastSyncedAt: string | null;
  lastSyncError: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [isSyncing, startSyncTransition] = useTransition();

  return (
    <div className="flex flex-col gap-1">
      {connected ? (
        <>
          <p className="text-sm text-good">Google Calendar connected.</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => startSyncTransition(() => syncGoogleCalendarNow())}
              disabled={isSyncing}
              className="flex-1 rounded-lg border border-accent/60 px-3 py-2 text-left text-sm text-accent disabled:opacity-50"
            >
              {isSyncing ? "Syncing..." : "Sync now"}
            </button>
            <button
              type="button"
              onClick={() => startTransition(() => disconnectGoogle())}
              disabled={isPending}
              className="rounded-lg border border-border px-3 py-2 text-left text-sm disabled:opacity-50"
            >
              {isPending ? "Disconnecting..." : "Disconnect"}
            </button>
          </div>
          {lastSyncedAt && (
            <p className="text-xs text-muted">Last synced {new Date(lastSyncedAt).toLocaleString()}</p>
          )}
          {lastSyncError && <p className="text-xs text-bad">Last sync error: {lastSyncError}</p>}
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
