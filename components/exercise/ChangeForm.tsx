"use client";

import { useState, useTransition } from "react";
import { changePlan } from "@/app/(app)/exercise/actions";

/** "Make Monday shorter" -> the AI updates the saved plan. */
export default function ChangeForm() {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await changePlan(text);
      if ("error" in result) setError(result.error);
      else setText("");
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={500}
          placeholder="e.g. Make Wednesday 45 minutes"
          className="min-w-0 flex-1 rounded-lg border border-border bg-bg px-3 py-2.5 text-base outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={pending || !text.trim()}
          className="shrink-0 rounded-lg bg-accent px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {pending ? "Updating…" : "Update"}
        </button>
      </div>
      {error && <p className="text-sm text-bad">{error}</p>}
    </form>
  );
}
