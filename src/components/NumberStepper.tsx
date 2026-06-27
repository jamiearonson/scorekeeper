import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface NumberStepperProps {
  value: number | null;
  onChange: (value: number | null) => void;
  /** Increment sizes, smallest first. One → a single −/+ pair; many → labeled coarse/fine pairs. */
  steps?: number[];
  min?: number;
  max?: number;
  placeholder?: string;
  /** Larger touch targets for the score-entry sheet. */
  size?: "default" | "lg";
  ariaLabel?: string;
}

/** Compact step label: 1000 → "1k", 1500 → "1.5k", 50 → "50". */
function fmtStep(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `${Number.isInteger(k) ? k : k.toFixed(1)}k`;
  }
  return String(n);
}

export function NumberStepper({
  value,
  onChange,
  steps = [1],
  min,
  max,
  placeholder = "0",
  size = "default",
  ariaLabel,
}: NumberStepperProps) {
  const clamp = (n: number) => {
    if (min !== undefined && n < min) return min;
    if (max !== undefined && n > max) return max;
    return n;
  };

  const bump = (delta: number) => onChange(clamp((value ?? 0) + delta));

  const asc = [...steps].sort((a, b) => a - b);
  const labeled = asc.length > 1;
  const btnSize = size === "lg" ? "size-12" : "size-10";
  const field = size === "lg" ? "h-12 text-2xl" : "h-10 text-lg";

  const stepButton = (step: number, dir: 1 | -1) => {
    const sign = dir < 0 ? "−" : "+";
    return (
      <Button
        key={`${dir}-${step}`}
        type="button"
        variant="outline"
        size={labeled ? "default" : "icon"}
        className={cn(
          "shrink-0",
          labeled
            ? "h-12 min-w-13 rounded-lg px-2 text-sm font-bold tabular-nums"
            : cn("rounded-full", btnSize),
        )}
        onClick={() => bump(dir * step)}
        aria-label={`${dir < 0 ? "Decrease" : "Increase"} by ${step}`}
        tabIndex={-1}
      >
        {labeled ? `${sign}${fmtStep(step)}` : dir < 0 ? <Minus className="size-5" /> : <Plus className="size-5" />}
      </Button>
    );
  };

  return (
    <div className="flex w-full items-center gap-1.5">
      {[...asc].reverse().map((s) => stepButton(s, -1))}
      <Input
        type="text"
        inputMode="numeric"
        pattern="-?[0-9]*"
        aria-label={ariaLabel}
        className={cn("min-w-0 flex-1 text-center font-semibold tabular-nums", field)}
        placeholder={placeholder}
        value={value === null ? "" : String(value)}
        onChange={(e) => {
          const raw = e.target.value.trim();
          if (raw === "" || raw === "-") {
            onChange(null);
            return;
          }
          const n = Number(raw);
          if (Number.isFinite(n)) onChange(clamp(n));
        }}
        onFocus={(e) => e.target.select()}
      />
      {asc.map((s) => stepButton(s, 1))}
    </div>
  );
}
