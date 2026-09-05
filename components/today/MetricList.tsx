"use client";

import { useOptimistic, useState, useTransition } from "react";
import { adjustMetric, setMetricValue } from "@/app/(app)/today/actions";

type Metric = { id: string; name: string; unit: string; weekly_target: number | null };

export default function MetricList({
  metrics,
  initialValues,
}: {
  metrics: Metric[];
  initialValues: Record<string, number>;
}) {
  const [values, setValues] = useOptimistic(
    initialValues,
    (state, update: { id: string; value: number }) => ({
      ...state,
      [update.id]: update.value,
    })
  );
  const [, startTransition] = useTransition();

  function bump(metricId: string, delta: number) {
    const next = Math.max(0, (values[metricId] ?? 0) + delta);
    startTransition(async () => {
      setValues({ id: metricId, value: next });
      await adjustMetric(metricId, delta);
    });
  }

  function setExact(metricId: string, value: number) {
    startTransition(async () => {
      setValues({ id: metricId, value });
      await setMetricValue(metricId, value);
    });
  }

  if (metrics.length === 0) {
    return <p className="text-sm text-muted">No metrics yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {metrics.map((metric) => (
        <MetricRow
          key={metric.id}
          metric={metric}
          value={values[metric.id] ?? 0}
          onBump={(delta) => bump(metric.id, delta)}
          onSetExact={(value) => setExact(metric.id, value)}
        />
      ))}
    </ul>
  );
}

function MetricRow({
  metric,
  value,
  onBump,
  onSetExact,
}: {
  metric: Metric;
  value: number;
  onBump: (delta: number) => void;
  onSetExact: (value: number) => void;
}) {
  const [custom, setCustom] = useState("");

  function submitCustom() {
    const parsed = Math.max(0, Number(custom) || 0);
    onSetExact(parsed);
    setCustom("");
  }

  return (
    <li className="rounded-lg border border-border px-3 py-2">
      <div className="flex items-center justify-between text-sm">
        <span>{metric.name}</span>
        <span className="text-muted">
          {value}
          {metric.weekly_target != null ? ` / ${metric.weekly_target}` : ""}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onBump(1)}
          className="rounded border border-border px-2 py-1 text-xs text-muted"
        >
          +1
        </button>
        <button
          type="button"
          onClick={() => onBump(5)}
          className="rounded border border-border px-2 py-1 text-xs text-muted"
        >
          +5
        </button>
        <input
          type="number"
          inputMode="numeric"
          placeholder="custom"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitCustom()}
          onBlur={() => custom !== "" && submitCustom()}
          className="w-16 rounded border border-border bg-transparent px-2 py-1 text-right text-xs"
        />
      </div>
    </li>
  );
}
