import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rounded-md border border-espresso/10 bg-ivory-dark/40 p-6", className)} {...props} />
  );
}
