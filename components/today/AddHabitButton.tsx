"use client";

import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { addHabit } from "@/app/(app)/today/actions";

export default function AddHabitButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState("");
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    startTransition(async () => {
      await addHabit(trimmed);
    });
    setName("");
    setIsOpen(false);
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => {
          setIsOpen(true);
          setTimeout(() => inputRef.current?.focus(), 0);
        }}
        className="flex w-full items-center justify-center gap-1 rounded-lg border border-dashed border-border py-2 text-xs text-muted"
      >
        <Plus size={14} />
        Add habit
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") setIsOpen(false);
        }}
        placeholder="New habit name"
        className="flex-1 rounded border border-border bg-transparent px-2 py-1.5 text-sm"
      />
      <button
        type="button"
        onClick={submit}
        className="rounded border border-accent/60 px-3 py-1.5 text-sm text-accent"
      >
        Add
      </button>
    </div>
  );
}
