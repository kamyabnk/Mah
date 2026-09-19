"use client";

import { cn } from "@/lib/cn";

interface QuantityStepperProps {
  value: number;
  max: number;
  onChange: (next: number) => void;
  className?: string;
}

export function QuantityStepper({ value, max, onChange, className }: QuantityStepperProps) {
  return (
    <div className={cn("inline-flex items-center rounded-sm border border-espresso/20", className)}>
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={value <= 1}
        onClick={() => onChange(value - 1)}
        className="flex h-9 w-9 items-center justify-center text-espresso disabled:opacity-30"
      >
        −
      </button>
      <input
        readOnly
        value={value}
        aria-label="Quantity"
        className="h-9 w-10 border-0 bg-transparent text-center text-espresso focus:outline-none"
      />
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        className="flex h-9 w-9 items-center justify-center text-espresso disabled:opacity-30"
      >
        +
      </button>
    </div>
  );
}
