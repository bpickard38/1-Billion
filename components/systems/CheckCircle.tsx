import { Check } from "lucide-react";

/**
 * A round check. Unchecked it can show a small label (a step number), or a
 * green ring that fills as steps are ticked (`progress` 0..1).
 */
export default function CheckCircle({
  checked,
  size,
  label,
  progress = 0,
}: {
  checked: boolean;
  size: "md" | "lg";
  label?: string;
  progress?: number;
}) {
  const px = size === "lg" ? 32 : 28;
  const box = size === "lg" ? "h-8 w-8" : "h-7 w-7";

  if (!checked && progress > 0) {
    const stroke = 2.5;
    const r = (px - stroke) / 2;
    const circumference = 2 * Math.PI * r;
    const filled = Math.min(1, progress) * circumference;
    return (
      <svg width={px} height={px} viewBox={`0 0 ${px} ${px}`} className="shrink-0 -rotate-90" aria-hidden="true">
        <circle cx={px / 2} cy={px / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        <circle
          cx={px / 2}
          cy={px / 2}
          r={r}
          fill="none"
          stroke="var(--good)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          className="transition-[stroke-dasharray] duration-300"
        />
      </svg>
    );
  }

  return (
    <span
      className={`flex ${box} shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold transition-colors ${
        checked ? "border-good bg-good text-white" : "border-border text-muted"
      }`}
    >
      {checked ? <Check size={size === "lg" ? 18 : 16} strokeWidth={3} /> : label}
    </span>
  );
}
