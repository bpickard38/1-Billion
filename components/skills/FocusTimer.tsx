"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Pause, Play, RotateCcw } from "lucide-react";

const PRESET_MINUTES = [15, 25, 45, 60];

function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// Simple countdown tied to a skill — nothing persisted (PLAN.md §3.7: "study
// skill" just needs a focus session, not a logged history). Beeps + a
// browser notification (if permission was already granted) when it hits 0.
export default function FocusTimer({ skillName }: { skillName: string }) {
  const [minutes, setMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          window.clearInterval(intervalRef.current!);
          setRunning(false);
          setDone(true);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current);
    };
  }, [running]);

  useEffect(() => {
    if (!done) return;
    try {
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("Focus session done", { body: skillName });
      }
    } catch {
      // Notification API unavailable — the on-screen banner is enough
    }
    navigator.vibrate?.([200, 100, 200]);
  }, [done, skillName]);

  function pickPreset(m: number) {
    setMinutes(m);
    setSecondsLeft(m * 60);
    setRunning(false);
    setDone(false);
  }

  function toggle() {
    if (done) {
      setSecondsLeft(minutes * 60);
      setDone(false);
    }
    setRunning((r) => !r);
  }

  function reset() {
    setRunning(false);
    setDone(false);
    setSecondsLeft(minutes * 60);
  }

  return (
    <div className="flex flex-col items-center gap-6 pt-8">
      <Link href="/skills" className="self-start text-sm text-muted">
        ← Skills
      </Link>

      <p className="text-sm text-muted">Studying</p>
      <h1 className="text-center text-xl font-semibold">{skillName}</h1>

      <div className={`text-6xl font-bold tabular-nums ${done ? "text-good" : ""}`}>
        {formatClock(secondsLeft)}
      </div>

      {done && <p className="text-sm text-good">Session complete.</p>}

      <div className="flex gap-1.5">
        {PRESET_MINUTES.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => pickPreset(m)}
            disabled={running}
            className={`rounded-full border px-3 py-1 text-xs ${
              minutes === m ? "border-accent bg-accent/20 text-accent" : "border-border text-muted"
            }`}
          >
            {m}m
          </button>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={toggle}
          className="flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-sm font-semibold text-bg"
        >
          {running ? <Pause size={16} /> : <Play size={16} />}
          {running ? "Pause" : done ? "Restart" : "Start"}
        </button>
        <button
          type="button"
          onClick={reset}
          className="flex items-center gap-2 rounded-lg border border-border px-4 py-3 text-sm text-muted"
        >
          <RotateCcw size={16} />
          Reset
        </button>
      </div>
    </div>
  );
}
