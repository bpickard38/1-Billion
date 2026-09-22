import { LEVEL_LABEL, type ChainLink, type GoalLevel } from "@/lib/goals";

// Shared trace-back rendering: deepest (starting) goal first, up to the Dream.
// Used by the Goals tree's per-node "Path to Dream".
export default function GoalChain({ chain }: { chain: ChainLink[] }) {
  if (chain.length === 0) return null;

  return (
    <ol className="flex flex-col gap-1 border-t border-border pt-2">
      {chain.map((link) => (
        <li key={link.id} className="text-xs text-muted">
          <span className="text-fg">{LEVEL_LABEL[link.level as GoalLevel] ?? link.level}</span>
          {" — "}
          {link.title}
        </li>
      ))}
    </ol>
  );
}
