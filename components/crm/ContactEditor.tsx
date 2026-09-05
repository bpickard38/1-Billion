"use client";

import { useState, useTransition } from "react";
import { upsertContact } from "@/app/(app)/crm/actions";
import InterviewSheet from "./InterviewSheet";
import type { ProblemOption } from "./ContactList";

export type Contact = {
  id: string;
  name: string;
  company: string | null;
  industry: string | null;
  role: string | null;
  type: string | null;
  email: string | null;
  phone: string | null;
  linkedin: string | null;
  where_met: string | null;
  expertise: string | null;
  interests: string | null;
  how_i_can_help: string | null;
  last_contact_on: string | null;
  follow_up_on: string | null;
  would_pilot: string | null;
  notes: string | null;
};

const TYPE_OPTIONS = [
  { value: "", label: "—" },
  { value: "customer_research", label: "Customer research" },
  { value: "founder", label: "Founder" },
  { value: "industry_expert", label: "Industry expert" },
  { value: "vendor", label: "Vendor" },
];

const PILOT_OPTIONS = [
  { value: "", label: "—" },
  { value: "yes", label: "Yes" },
  { value: "maybe", label: "Maybe" },
  { value: "no", label: "No" },
];

function field(
  label: string,
  value: string,
  onChange: (v: string) => void,
  props: React.InputHTMLAttributes<HTMLInputElement> = {}
) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded border border-border bg-transparent p-2 text-sm"
        {...props}
      />
    </label>
  );
}

export default function ContactEditor({
  contact,
  problems,
  today,
  onClose,
}: {
  contact?: Contact;
  problems: ProblemOption[];
  today: string;
  onClose: () => void;
}) {
  const [name, setName] = useState(contact?.name ?? "");
  const [company, setCompany] = useState(contact?.company ?? "");
  const [industry, setIndustry] = useState(contact?.industry ?? "");
  const [role, setRole] = useState(contact?.role ?? "");
  const [type, setType] = useState(contact?.type ?? "");
  const [email, setEmail] = useState(contact?.email ?? "");
  const [phone, setPhone] = useState(contact?.phone ?? "");
  const [linkedin, setLinkedin] = useState(contact?.linkedin ?? "");
  const [whereMet, setWhereMet] = useState(contact?.where_met ?? "");
  const [expertise, setExpertise] = useState(contact?.expertise ?? "");
  const [interests, setInterests] = useState(contact?.interests ?? "");
  const [howICanHelp, setHowICanHelp] = useState(contact?.how_i_can_help ?? "");
  const [lastContactOn, setLastContactOn] = useState(contact?.last_contact_on ?? "");
  const [followUpOn, setFollowUpOn] = useState(contact?.follow_up_on ?? "");
  const [wouldPilot, setWouldPilot] = useState(contact?.would_pilot ?? "");
  const [notes, setNotes] = useState(contact?.notes ?? "");
  const [showInterview, setShowInterview] = useState(false);
  const [isPending, startTransition] = useTransition();

  function save() {
    if (!name.trim()) return;
    startTransition(async () => {
      await upsertContact({
        id: contact?.id,
        name: name.trim(),
        company: company.trim() || null,
        industry: industry.trim() || null,
        role: role.trim() || null,
        type: type || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
        linkedin: linkedin.trim() || null,
        whereMet: whereMet.trim() || null,
        expertise: expertise.trim() || null,
        interests: interests.trim() || null,
        howICanHelp: howICanHelp.trim() || null,
        lastContactOn: lastContactOn || null,
        followUpOn: followUpOn || null,
        wouldPilot: wouldPilot || null,
        notes: notes.trim() || null,
      });
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60">
      <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl border-t border-border bg-surface p-4 pb-safe">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{contact ? "Edit contact" : "Add contact"}</h2>
          <button type="button" onClick={onClose} className="text-sm text-muted">
            Close
          </button>
        </div>

        <div className="mt-3 flex flex-col gap-3">
          {field("Name", name, setName, { autoFocus: true })}
          <div className="flex gap-2">
            <div className="flex-1">{field("Company", company, setCompany)}</div>
            <div className="flex-1">{field("Industry", industry, setIndustry)}</div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">{field("Role", role, setRole)}</div>
            <label className="flex flex-1 flex-col gap-1 text-sm">
              Type
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="rounded border border-border bg-transparent p-2 text-sm"
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {field("Email", email, setEmail, { type: "email" })}
          {field("Phone", phone, setPhone, { type: "tel" })}
          {field("LinkedIn", linkedin, setLinkedin)}
          {field("Where met", whereMet, setWhereMet)}
          {field("Expertise", expertise, setExpertise)}
          {field("What they care about", interests, setInterests)}
          {field("How I can help them", howICanHelp, setHowICanHelp)}
          <div className="flex gap-2">
            <div className="flex-1">
              {field("Last contact", lastContactOn, setLastContactOn, { type: "date" })}
            </div>
            <div className="flex-1">{field("Follow up", followUpOn, setFollowUpOn, { type: "date" })}</div>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            Would pilot?
            <select
              value={wouldPilot}
              onChange={(e) => setWouldPilot(e.target.value)}
              className="rounded border border-border bg-transparent p-2 text-sm"
            >
              {PILOT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            Notes
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="rounded border border-border bg-transparent p-2 text-sm"
            />
          </label>

          {contact && (
            <button
              type="button"
              onClick={() => setShowInterview(true)}
              className="rounded-lg border border-accent/60 px-3 py-2 text-sm text-accent"
            >
              Log interview
            </button>
          )}

          <button
            type="button"
            onClick={save}
            disabled={isPending}
            className="mt-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-bg disabled:opacity-50"
          >
            {isPending ? "Saving..." : "Save"}
          </button>
        </div>
      </div>

      {showInterview && contact && (
        <InterviewSheet
          contactId={contact.id}
          problems={problems}
          today={today}
          onClose={() => {
            setShowInterview(false);
            onClose();
          }}
        />
      )}
    </div>
  );
}
