"use client";

import { useEffect, useOptimistic, useRef, useState, useTransition } from "react";
import { ArrowUp } from "lucide-react";
import VoiceButton from "@/components/systems/VoiceButton";
import { clearChat, sendMessage } from "@/app/(app)/chat/actions";

type Message = { id: string; role: string; content: string };

export default function ChatWindow({ messages }: { messages: Message[] }) {
  const [shown, addPending] = useOptimistic(messages, (state, text: string) => [
    ...state,
    { id: "pending", role: "user", content: text },
  ]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [pending, startTransition] = useTransition();
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [shown.length, pending]);

  function send(e?: React.FormEvent) {
    e?.preventDefault();
    const message = text.trim();
    if (!message || pending) return;
    setError(null);
    setText("");
    startTransition(async () => {
      addPending(message);
      const result = await sendMessage(message);
      if ("error" in result) {
        setError(result.error);
        if (result.error.startsWith("One moment") || result.error.startsWith("Type")) setText(message);
      }
    });
  }

  return (
    <>
      {shown.length === 0 ? (
        <p className="pt-10 text-center text-sm text-muted">Ask anything. Tap the mic to talk instead of typing.</p>
      ) : (
        <div className="flex justify-end pb-2">
          <button
            type="button"
            onClick={() => (confirmClear ? startTransition(async () => { await clearChat(); setConfirmClear(false); }) : setConfirmClear(true))}
            className="text-xs text-muted"
          >
            {confirmClear ? "Tap again to clear the chat" : "Clear chat"}
          </button>
        </div>
      )}

      <ul className="flex flex-col gap-3 pb-36">
        {shown.map((m) => (
          <li key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <p
              className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed ${
                m.role === "user" ? "rounded-br-md bg-accent text-white" : "rounded-bl-md bg-surface"
              }`}
            >
              {m.content}
            </p>
          </li>
        ))}
        {pending && shown.at(-1)?.role === "user" && (
          <li className="flex">
            <p className="flex gap-1 rounded-2xl rounded-bl-md bg-surface px-4 py-3.5" aria-label="Thinking">
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted" />
            </p>
          </li>
        )}
        {error && <li className="text-center text-sm text-bad">{error}</li>}
      </ul>
      <div ref={bottom} />

      <form
        onSubmit={send}
        className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] border-t border-border bg-bg/95 px-4 py-2 backdrop-blur"
      >
        <div className="mx-auto flex max-w-lg items-end gap-2">
          <VoiceButton disabled={pending} onError={setError} onText={(t) => setText((cur) => (cur ? `${cur} ${t}` : t))} />
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={1}
            maxLength={8000}
            placeholder="Message"
            className="max-h-32 min-h-[44px] min-w-0 flex-1 resize-none rounded-2xl border border-border bg-bg px-4 py-2.5 text-base outline-none focus:border-accent [field-sizing:content]"
          />
          <button
            type="submit"
            disabled={pending || !text.trim()}
            aria-label="Send"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-white disabled:opacity-40"
          >
            <ArrowUp size={20} strokeWidth={2.5} />
          </button>
        </div>
      </form>
    </>
  );
}
