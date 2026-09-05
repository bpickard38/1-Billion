"use client";

import { useState, useTransition } from "react";
import { closeUnreviewedWeeks } from "@/app/(app)/week/actions";

// Stand-in for Phase 9's daily cron route, which will do this automatically.
export default function CloseUnreviewedWeeksButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<string | null>(null);

  function run() {
    setResult(null);
    startTransition(async () => {
      const count = await closeUnreviewedWeeks();
      setResult(count === 0 ? "Nothing to close." : `Closed ${count} week${count === 1 ? "" : "s"}.`);
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={run}
        disabled={isPending}
        className="rounded-lg border border-border px-3 py-2 text-left text-sm disabled:opacity-50"
      >
        {isPending ? "Closing..." : "Close unreviewed weeks"}
      </button>
      {result && <p className="text-xs text-muted">{result}</p>}
    </div>
  );
}
