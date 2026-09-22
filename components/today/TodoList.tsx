"use client";

import { useRef, useState, useTransition } from "react";
import { Check, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { addTodo, deleteTodo, editTodo, moveTodo, toggleTodo } from "@/app/(app)/today/actions";

type Todo = { id: string; title: string; done: boolean; sort: number };

function TodoRow({ todo, isFirst, isLast, rank }: { todo: Todo; isFirst: boolean; isLast: boolean; rank: number }) {
  const [title, setTitle] = useState(todo.title);
  const [editing, setEditing] = useState(false);
  const [isPending, startTransition] = useTransition();

  function commitTitle() {
    setEditing(false);
    if (title.trim() && title.trim() !== todo.title) startTransition(() => editTodo(todo.id, title));
  }

  return (
    <li className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
      <button
        type="button"
        onClick={() => startTransition(() => toggleTodo(todo.id, !todo.done))}
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          todo.done ? "border-good bg-good text-bg" : "border-border"
        }`}
      >
        {todo.done && <Check size={14} strokeWidth={3} />}
      </button>

      {rank === 1 && !todo.done && <span className="shrink-0 text-xs font-bold text-accent">#1</span>}

      {editing ? (
        <input
          autoFocus
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={commitTitle}
          onKeyDown={(e) => e.key === "Enter" && commitTitle()}
          className="flex-1 rounded border border-border bg-transparent px-1 text-sm outline-none"
        />
      ) : (
        <span
          onClick={() => setEditing(true)}
          className={`flex-1 truncate ${todo.done ? "text-muted line-through" : ""}`}
        >
          {todo.title}
        </span>
      )}

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          disabled={isFirst || isPending}
          onClick={() => startTransition(() => moveTodo(todo.id, "up"))}
          className="text-muted disabled:opacity-30"
          aria-label="Move up"
        >
          <ChevronUp size={16} />
        </button>
        <button
          type="button"
          disabled={isLast || isPending}
          onClick={() => startTransition(() => moveTodo(todo.id, "down"))}
          className="text-muted disabled:opacity-30"
          aria-label="Move down"
        >
          <ChevronDown size={16} />
        </button>
        <button
          type="button"
          onClick={() => startTransition(() => deleteTodo(todo.id))}
          className="text-bad"
          aria-label={`Delete ${todo.title}`}
        >
          <Trash2 size={14} />
        </button>
      </div>
    </li>
  );
}

export default function TodoList({ todos }: { todos: Todo[] }) {
  const [name, setName] = useState("");
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function submit() {
    const trimmed = name.trim();
    if (!trimmed) return;
    startTransition(() => addTodo(trimmed));
    setName("");
    inputRef.current?.focus();
  }

  return (
    <div className="flex flex-col gap-2">
      {todos.length === 0 && (
        <p className="text-sm text-muted">Nothing on today&apos;s list yet — plan today to fill it in.</p>
      )}

      <ul className="flex flex-col gap-2">
        {todos.map((todo, i) => (
          <TodoRow key={todo.id} todo={todo} rank={i + 1} isFirst={i === 0} isLast={i === todos.length - 1} />
        ))}
      </ul>

      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="Add a to-do"
          disabled={isPending}
          className="flex-1 rounded border border-border bg-transparent px-2 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="flex shrink-0 items-center gap-1 rounded border border-accent/60 px-3 py-1.5 text-sm text-accent"
        >
          <Plus size={14} />
          Add
        </button>
      </div>
    </div>
  );
}
