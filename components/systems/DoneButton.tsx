"use client";

import { useOptimistic, useTransition } from "react";
import CheckCircle from "@/components/systems/CheckCircle";
import { setSystemDone } from "@/app/(app)/systems/actions";

export default function DoneButton({ systemId, initialDone }: { systemId: string; initialDone: boolean }) {
  const [done, setDone] = useOptimistic(initialDone);
  const [, startTransition] = useTransition();

  function toggle() {
    const next = !done;
    startTransition(async () => {
      setDone(next);
      await setSystemDone(systemId, next);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={`mt-4 flex w-full items-center justify-center gap-3 rounded-xl border py-4 font-semibold transition-colors ${
        done ? "border-good/30 bg-good/10 text-good" : "border-accent bg-accent text-white active:opacity-80"
      }`}
    >
      {done ? <CheckCircle checked size="lg" /> : <span className="h-8 w-8 rounded-full border-2 border-white/80" />}
      {done ? "Done for today" : "Mark done"}
    </button>
  );
}
