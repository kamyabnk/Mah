import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-11 w-full rounded-sm border border-espresso/20 bg-ivory px-4 text-base text-espresso placeholder:text-espresso-light/60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
