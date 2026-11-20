import { Check } from "lucide-react";

export default function CheckCircle({ checked, size }: { checked: boolean; size: "md" | "lg" }) {
  const box = size === "lg" ? "h-8 w-8" : "h-7 w-7";
  return (
    <span
      className={`flex ${box} shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
        checked ? "border-good bg-good text-white" : "border-border"
      }`}
    >
      {checked && <Check size={size === "lg" ? 18 : 16} strokeWidth={3} />}
    </span>
  );
}
