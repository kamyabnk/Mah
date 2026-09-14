import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Text({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("font-sans text-base leading-relaxed text-espresso-light", className)} {...props} />
  );
}
