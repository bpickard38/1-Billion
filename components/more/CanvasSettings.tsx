"use client";

import { useState, useTransition } from "react";
import { connectCanvas, disconnectCanvas, getCanvasSettings, refreshCanvas } from "@/app/(app)/more/canvas/actions";

type Settings = NonNullable<Awaited<ReturnType<typeof getCanvasSettings>>["data"]>;
export default function CanvasSettings({ initial, initialError }: { initial: Settings | null; initialError: string | null }) {
  const [settings,setSettings] = useState(initial);
  const [token,setToken] = useState("");
  const [selected,setSelected] = useState(initial?.selected ?? []);
  const [error,setError] = useState(initialError);
  const [message,setMessage] = useState("");
  const [pending,startTransition] = useTransition();
  const inputClass = "w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm";
  function run(fn: () => Promise<void>) { setError(null); setMessage(""); startTransition(async () => { try { await fn(); } catch { setError("The connection failed. Please try again."); } }); }
  async function reload() { const result = await getCanvasSettings(); if (result.error) setError(result.error); else { setSettings(result.data!); setSelected(result.data!.selected); } }
  return <div className="flex flex-col gap-4">
    <div className="rounded-xl border border-border p-4"><p className="font-medium">BYU · byu.instructure.com</p><p className="mt-1 text-sm text-muted">Read-only connection. Assignments are never changed or submitted by this app.</p><p className="mt-2 text-sm">{settings?.connected ? "Connected" : "Not connected"}{settings?.lastSyncedAt ? ` · Last refreshed ${new Date(settings.lastSyncedAt).toLocaleString()}` : ""}</p></div>
    <form className="flex flex-col gap-3" onSubmit={event => { event.preventDefault(); const value = token; setToken(""); run(async () => { const result = await connectCanvas(value); if (result.error) { setError(result.error); return; } await reload(); setMessage("Connected. Choose your courses below, then import assignments."); }); }}>
      <label className="text-sm">{settings?.connected ? "Replace access token" : "Canvas access token"}<input required type="password" autoComplete="off" value={token} onChange={e => setToken(e.target.value)} className={`${inputClass} mt-1`} placeholder="Paste your token here" maxLength={4096} disabled={pending} /></label>
      <p className="text-xs text-muted">In Canvas, open Account → Settings → New Access Token. Purpose can be “1B assignment planner.” Choose an expiration date. Your token is encrypted on the server and never sent to AI.</p>
      <button disabled={pending || !token.trim()} className="rounded-lg bg-accent px-4 py-2 font-medium text-bg disabled:opacity-50">{pending ? "Working…" : settings?.connected ? "Replace token" : "Connect Canvas"}</button>
    </form>
    {settings?.connected && <section className="flex flex-col gap-3 rounded-xl border border-border p-4"><h2 className="font-semibold">Courses to include</h2>{settings.courses.length === 0 && <p className="text-sm text-muted">No active student courses were returned by Canvas.</p>}{settings.courses.map(c => <label key={c.id} className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={pending} checked={selected.includes(c.id)} onChange={e => setSelected(e.target.checked ? [...selected,c.id] : selected.filter(id => id !== c.id))} />{c.name}</label>)}<button disabled={pending} className="rounded-lg border border-accent px-3 py-2 text-accent disabled:opacity-50" onClick={() => run(async () => { const result = await refreshCanvas(selected); if (result.error) { setError(result.error); return; } await reload(); setMessage(`Refreshed ${result.data!.count} assignments.`); })}>Save courses and refresh assignments</button><details className="text-sm"><summary className="cursor-pointer text-muted">Disconnect Canvas</summary><p className="my-2">Remove the saved token and imported assignments. Existing calendar blocks remain.</p><button disabled={pending} className="text-bad" onClick={() => run(async () => { const result = await disconnectCanvas(); if (result.error) setError(result.error); else { await reload(); setMessage("Canvas disconnected."); } })}>Disconnect and remove imported data</button></details></section>}
    {error && <p role="alert" className="rounded-lg border border-bad p-3 text-sm text-bad">{error}</p>}
    {message && <p role="status" className="text-sm text-good">{message}</p>}
  </div>;
}
