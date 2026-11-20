import { Check } from "lucide-react";

/** A round check. When unchecked it can show a small label (a step number). */
export default function CheckCircle({
  checked,
  size,
  label,
}: {
  checked: boolean;
  size: "md" | "lg";
  label?: string;
}) {
  const box = size === "lg" ? "h-8 w-8" : "h-7 w-7";
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
