import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type BadgeVariant = "sale" | "new" | "bestseller" | "outOfStock";

const variantClasses: Record<BadgeVariant, string> = {
  sale: "bg-terracotta text-ivory",
  new: "bg-sage text-ivory",
  bestseller: "bg-amber text-ivory",
  outOfStock: "bg-espresso-light text-ivory",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ variant = "new", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2.5 py-1 text-xs font-medium uppercase tracking-wide",
        variantClasses[variant],
        className
      )}
      {...props}
    />
  );
}
