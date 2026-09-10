"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isAfterWeeklyReviewCutoff } from "@/lib/dates";

const DISMISS_HOURS = 2;

function dismissKey(weekStart: string) {
  return `weekly-review-dismissed-until:${weekStart}`;
}

function isDismissed(weekStart: string): boolean {
  try {
    const raw = localStorage.getItem(dismissKey(weekStart));
    return raw !== null && Date.now() < Number(raw);
  } catch {
    return false;
  }
}

// Full-screen "Weekly Review Required" card from Friday 5 PM local until the
// week closes. Mounted app-wide (app/(app)/layout.tsx) since it should show
// "opening the app", not just on the Week tab. /week/review itself is always
// reachable and never gated.
//
// Visibility is driven by a ref + direct DOM toggle, not React state: whether
// to show depends on localStorage and wall-clock time, both client-only and
// unknowable during SSR, so any state-based approach would either mismatch
// hydration or need a "set state in an effect" that only fixes rendering
// after the fact. The overlay always exists in the tree (hidden by default,
// matching SSR) and the effect just synchronizes it with the outside world —
// exactly what effects are for.
export default function WeeklyReviewGate({
  weekStart,
  timeZone,
  isClosed,
}: {
  weekStart: string;
  timeZone: string;
  isClosed: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function sync() {
      const shouldShow =
        !isClosed &&
        pathname !== "/week/review" &&
        pathname !== "/schedule/plan" &&
        isAfterWeeklyReviewCutoff(new Date(), timeZone) &&
        !isDismissed(weekStart);
      if (overlayRef.current) overlayRef.current.hidden = !shouldShow;
    }
    sync();
    const interval = setInterval(sync, 60_000);
    return () => clearInterval(interval);
  }, [weekStart, timeZone, isClosed, pathname]);

  function later() {
    try {
      localStorage.setItem(dismissKey(weekStart), String(Date.now() + DISMISS_HOURS * 60 * 60 * 1000));
    } catch {
      // localStorage unavailable — the gate just reappears on the next check, which is fine
    }
    if (overlayRef.current) overlayRef.current.hidden = true;
  }

  return (
    <div
      ref={overlayRef}
      hidden
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-bg p-6 text-center"
    >
      <h1 className="text-xl font-bold">Weekly Review Required</h1>
      <p className="text-sm text-muted">
        This week isn&apos;t closed yet — finish the weekly review before starting new work.
      </p>
      <button
        type="button"
        onClick={() => router.push("/week/review")}
        className="w-full max-w-xs rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-bg"
      >
        Start review
      </button>
      <button type="button" onClick={later} className="text-sm text-muted">
        Later (2 hours)
      </button>
    </div>
  );
}
