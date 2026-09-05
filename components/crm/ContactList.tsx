"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import ContactEditor, { type Contact } from "./ContactEditor";

const TYPE_LABEL: Record<string, string> = {
  customer_research: "Customer research",
  founder: "Founder",
  industry_expert: "Industry expert",
  vendor: "Vendor",
};

export type ProblemOption = { id: string; title: string };

export default function ContactList({
  contacts,
  problems,
  today,
  initialDueOnly,
}: {
  contacts: Contact[];
  problems: ProblemOption[];
  today: string;
  initialDueOnly: boolean;
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [dueOnly, setDueOnly] = useState(initialDueOnly);
  const [editing, setEditing] = useState<Contact | "new" | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts
      .filter((c) => (typeFilter === "all" ? true : c.type === typeFilter))
      .filter((c) => (dueOnly ? Boolean(c.follow_up_on) && c.follow_up_on! <= today : true))
      .filter((c) =>
        q ? c.name.toLowerCase().includes(q) || (c.company ?? "").toLowerCase().includes(q) : true
      )
      .sort((a, b) => {
        if (!a.follow_up_on && !b.follow_up_on) return a.name.localeCompare(b.name);
        if (!a.follow_up_on) return 1;
        if (!b.follow_up_on) return -1;
        return a.follow_up_on.localeCompare(b.follow_up_on);
      });
  }, [contacts, search, typeFilter, dueOnly, today]);

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={() => setEditing("new")}
        className="flex items-center justify-center gap-1 self-start rounded-lg border border-dashed border-border px-3 py-1.5 text-xs text-muted"
      >
        <Plus size={14} />
        Add contact
      </button>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search name or company"
        className="rounded border border-border bg-transparent p-2 text-sm"
      />

      <div className="flex gap-2">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="flex-1 rounded border border-border bg-transparent p-2 text-sm"
        >
          <option value="all">All types</option>
          {Object.entries(TYPE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setDueOnly((v) => !v)}
          className={`rounded border px-3 py-2 text-xs ${
            dueOnly ? "border-accent text-accent" : "border-border text-muted"
          }`}
        >
          Follow-ups due
        </button>
      </div>

      {filtered.length === 0 && <p className="text-sm text-muted">No contacts match.</p>}

      <ul className="flex flex-col gap-2">
        {filtered.map((c) => {
          const isDue = Boolean(c.follow_up_on) && c.follow_up_on! <= today;
          return (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => setEditing(c)}
                className="flex w-full items-center justify-between rounded-lg border border-border p-3 text-left"
              >
                <span className="flex flex-col">
                  <span className="text-sm font-medium">{c.name}</span>
                  <span className="text-xs text-muted">
                    {[c.company, c.role].filter(Boolean).join(" · ") || "—"}
                  </span>
                </span>
                {c.follow_up_on && (
                  <span className={`shrink-0 text-xs ${isDue ? "text-bad" : "text-muted"}`}>
                    Follow up {c.follow_up_on}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {editing && (
        <ContactEditor
          contact={editing === "new" ? undefined : editing}
          problems={problems}
          today={today}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}
