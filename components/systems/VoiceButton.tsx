"use client";

import { useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";

const MAX_SECONDS = 60;

/** Tap to record, tap again to stop. The recording is turned into text by /api/transcribe. */
export default function VoiceButton({
  onText,
  onError,
  disabled,
}: {
  onText: (text: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}) {
  const [status, setStatus] = useState<"idle" | "recording" | "working">("idle");
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function start() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      onError("This browser can't record audio.");
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      onError("Microphone access was blocked. Allow it in your browser settings.");
      return;
    }

    // Chrome records webm; iPhone Safari records mp4.
    const mimeType = ["audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t));
    const rec = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size > 0 && chunks.push(e.data);
    rec.onstop = async () => {
      stream.getTracks().forEach((t) => t.stop());
      if (timer.current) clearTimeout(timer.current);
      setStatus("working");
      const type = rec.mimeType || mimeType || "audio/webm";
      const ext = type.includes("mp4") ? "mp4" : "webm";
      const form = new FormData();
      form.append("audio", new Blob(chunks, { type }), `voice.${ext}`);
      try {
        const res = await fetch("/api/transcribe", { method: "POST", body: form });
        const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
        if (!res.ok || !data.text) onError(data.error ?? "Transcription failed.");
        else onText(data.text);
      } catch {
        onError("Couldn't reach the server. Check your connection.");
      } finally {
        setStatus("idle");
      }
    };

    recorder.current = rec;
    rec.start();
    setStatus("recording");
    timer.current = setTimeout(() => rec.state === "recording" && rec.stop(), MAX_SECONDS * 1000);
  }

  function stop() {
    if (recorder.current?.state === "recording") recorder.current.stop();
  }

  return (
    <button
      type="button"
      onClick={status === "recording" ? stop : start}
      disabled={disabled || status === "working"}
      aria-label={status === "recording" ? "Stop recording" : "Speak instead of typing"}
      className={`flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
        status === "recording" ? "animate-pulse bg-bad text-white" : "border border-accent text-accent"
      }`}
    >
      {status === "working" ? (
        <Loader2 size={18} className="animate-spin" />
      ) : status === "recording" ? (
        <>
          <Square size={14} fill="currentColor" />
          Stop
        </>
      ) : (
        <Mic size={18} />
      )}
    </button>
  );
}
