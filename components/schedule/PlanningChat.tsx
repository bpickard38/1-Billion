"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { sendPlanningMessage, confirmChatProposal } from "@/app/(app)/schedule/plan/chat-actions";
import { categoryDotClass } from "@/lib/categories";

type Proposal = {
  ready: true;
  todos: { title: string }[];
  blocks: { title: string; start: string; end: string; category: string }[];
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  payload: Proposal | null;
};

export default function PlanningChat({ initial }: { initial: { date: string; messages: ChatMessage[] } }) {
  const [messages, setMessages] = useState<ChatMessage[]>(initial.messages);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [confirmedId, setConfirmedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const typing = isPending && confirmingId === null;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  function send() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setError(null);
    setText("");
    const optimisticId = `pending-${Date.now()}`;
    setMessages((m) => [...m, { id: optimisticId, role: "user", content: trimmed, payload: null }]);
    startTransition(async () => {
      const result = await sendPlanningMessage(initial.date, trimmed);
      if (result.error) {
        setError(result.error);
        setMessages((m) => m.filter((msg) => msg.id !== optimisticId));
        setText(trimmed);
        return;
      }
      setMessages((m) => [
        ...m.filter((msg) => msg.id !== optimisticId),
        result.data!.userMessage as unknown as ChatMessage,
        result.data!.assistantMessage as unknown as ChatMessage,
      ]);
    });
  }

  function confirm(message: ChatMessage) {
    if (!message.payload) return;
    setError(null);
    setConfirmingId(message.id);
    startTransition(async () => {
      const result = await confirmChatProposal(initial.date, message.payload!.todos, message.payload!.blocks);
      setConfirmingId(null);
      if (result.error) {
        setError(result.error);
        return;
      }
      setConfirmedId(message.id);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              m.role === "user" ? "ml-auto bg-accent text-bg" : "border border-border bg-surface"
            }`}
          >
            <p className="whitespace-pre-wrap">{m.content}</p>

            {m.payload?.ready && (
              <div className="mt-2 rounded border border-border/60 bg-bg/40 p-2 text-fg">
                {m.payload.todos.length > 0 && (
                  <ol className="flex flex-col gap-0.5 text-xs">
                    {m.payload.todos.map((t, i) => (
                      <li key={i}>
                        {i + 1}. {t.title}
                      </li>
                    ))}
                  </ol>
                )}
                {m.payload.blocks.length > 0 && (
                  <ul className="mt-2 flex flex-col gap-0.5 text-xs">
                    {m.payload.blocks.map((b, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${categoryDotClass(b.category)}`} />
                        <span className="text-muted">
                          {b.start}–{b.end}
                        </span>
                        <span>{b.title}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  onClick={() => confirm(m)}
                  disabled={confirmingId === m.id || confirmedId === m.id}
                  className="mt-2 rounded bg-accent px-3 py-1.5 text-xs font-semibold text-bg disabled:opacity-50"
                >
                  {confirmedId === m.id ? "Added ✓" : confirmingId === m.id ? "Adding..." : "Add to my day"}
                </button>
              </div>
            )}
          </div>
        ))}
        {typing && (
          <div
            role="status"
            aria-label="Assistant is typing"
            className="flex w-fit items-center gap-1 rounded-lg border border-border bg-surface px-3 py-3"
          >
            {[0, 150, 300].map((delay) => (
              <span
                key={delay}
                className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
        )}
        <div ref={endRef} />
      </div>

      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Tell it what's on your mind..."
          disabled={isPending}
          className="flex-1 rounded-lg border border-border bg-transparent px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={send}
          disabled={isPending || !text.trim()}
          className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-bg disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </div>
  );
}
