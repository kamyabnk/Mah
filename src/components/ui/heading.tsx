import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type HeadingLevel = 1 | 2 | 3 | 4;

interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level?: HeadingLevel;
}

const levelClasses: Record<HeadingLevel, string> = {
  1: "text-4xl md:text-5xl",
  2: "text-3xl md:text-4xl",
  3: "text-2xl md:text-3xl",
  4: "text-xl md:text-2xl",
};

export function Heading({ level = 2, className, ...props }: HeadingProps) {
  const Tag = `h${level}` as const;
  return (
    <Tag
      className={cn(
        "font-display font-medium tracking-tight text-espresso",
        levelClasses[level],
        className
      )}
      {...props}
    />
  );
}
