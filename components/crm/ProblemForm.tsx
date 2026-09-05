"use client";

import { useState, useTransition } from "react";
import { upsertProblem } from "@/app/(app)/crm/actions";

export type Problem = {
  id: string;
  title: string;
  description: string | null;
  user_role: string | null;
  buyer: string | null;
  frequency: string | null;
  existing_solution: string | null;
  labor_cost: string | null;
  revenue_impact: string | null;
  urgency: number | null;
  wtp: string | null;
  ai_opportunity: number | null;
  competition: string | null;
  tam: string | null;
  expansion: string | null;
  access: string | null;
  score: number | null;
};

function textField(
  label: string,
  value: string,
  onChange: (v: string) => void,
  multiline = false
) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      {label}
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className="rounded border border-border bg-transparent p-2 text-sm"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="rounded border border-border bg-transparent p-2 text-sm"
        />
      )}
    </label>
  );
}

export default function ProblemForm({ problem }: { problem: Problem }) {
  const [title, setTitle] = useState(problem.title);
  const [description, setDescription] = useState(problem.description ?? "");
  const [userRole, setUserRole] = useState(problem.user_role ?? "");
  const [buyer, setBuyer] = useState(problem.buyer ?? "");
  const [frequency, setFrequency] = useState(problem.frequency ?? "");
  const [existingSolution, setExistingSolution] = useState(problem.existing_solution ?? "");
  const [laborCost, setLaborCost] = useState(problem.labor_cost ?? "");
  const [revenueImpact, setRevenueImpact] = useState(problem.revenue_impact ?? "");
  const [urgency, setUrgency] = useState(problem.urgency?.toString() ?? "");
  const [wtp, setWtp] = useState(problem.wtp ?? "");
  const [aiOpportunity, setAiOpportunity] = useState(problem.ai_opportunity?.toString() ?? "");
  const [competition, setCompetition] = useState(problem.competition ?? "");
  const [tam, setTam] = useState(problem.tam ?? "");
  const [expansion, setExpansion] = useState(problem.expansion ?? "");
  const [access, setAccess] = useState(problem.access ?? "");
  const [score, setScore] = useState(problem.score?.toString() ?? "");
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function save() {
    if (!title.trim()) return;
    startTransition(async () => {
      await upsertProblem({
        id: problem.id,
        title: title.trim(),
        description: description.trim() || null,
        userRole: userRole.trim() || null,
        buyer: buyer.trim() || null,
        frequency: frequency.trim() || null,
        existingSolution: existingSolution.trim() || null,
        laborCost: laborCost.trim() || null,
        revenueImpact: revenueImpact.trim() || null,
        urgency: urgency.trim() ? Number(urgency) : null,
        wtp: wtp.trim() || null,
        aiOpportunity: aiOpportunity.trim() ? Number(aiOpportunity) : null,
        competition: competition.trim() || null,
        tam: tam.trim() || null,
        expansion: expansion.trim() || null,
        access: access.trim() || null,
        score: score.trim() ? Number(score) : null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="flex flex-col gap-3 pb-8">
      {textField("Title", title, setTitle)}
      {textField("Description", description, setDescription, true)}
      {textField("User", userRole, setUserRole)}
      {textField("Buyer", buyer, setBuyer)}
      {textField("Frequency", frequency, setFrequency)}
      {textField("Existing solution", existingSolution, setExistingSolution)}
      {textField("Labor cost", laborCost, setLaborCost)}
      {textField("Revenue impact", revenueImpact, setRevenueImpact)}

      <div className="flex gap-2">
        <label className="flex flex-1 flex-col gap-1 text-sm">
          Urgency (/10)
          <input
            type="number"
            min={1}
            max={10}
            value={urgency}
            onChange={(e) => setUrgency(e.target.value)}
            className="rounded border border-border bg-transparent p-2 text-sm"
          />
        </label>
        <label className="flex flex-1 flex-col gap-1 text-sm">
          AI opportunity (/10)
          <input
            type="number"
            min={1}
            max={10}
            value={aiOpportunity}
            onChange={(e) => setAiOpportunity(e.target.value)}
            className="rounded border border-border bg-transparent p-2 text-sm"
          />
        </label>
      </div>

      {textField("WTP", wtp, setWtp)}
      {textField("Competition", competition, setCompetition)}
      {textField("TAM", tam, setTam)}
      {textField("Expansion", expansion, setExpansion)}
      {textField("Access", access, setAccess)}

      <label className="flex flex-col gap-1 text-sm">
        Score (/100)
        <input
          type="number"
          min={0}
          max={100}
          value={score}
          onChange={(e) => setScore(e.target.value)}
          className="rounded border border-border bg-transparent p-2 text-sm"
        />
      </label>

      <button
        type="button"
        onClick={save}
        disabled={isPending}
        className="mt-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-bg disabled:opacity-50"
      >
        {isPending ? "Saving..." : saved ? "Saved" : "Save"}
      </button>
    </div>
  );
}
