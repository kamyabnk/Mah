import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function AdminPageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-display text-2xl font-medium text-espresso md:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-espresso-light">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-md border border-espresso/10 bg-ivory shadow-sm", className)}
      {...props}
    />
  );
}

export function PanelHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-espresso/10 px-5 py-4">
      <div className="min-w-0">
        <h2 className="font-display text-lg font-medium text-espresso">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-espresso-light">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

export function FormSection({
  title,
  description,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Panel className="p-5">
      <h2 className="font-display text-lg font-medium text-espresso">{title}</h2>
      {description && <p className="mt-0.5 text-xs text-espresso-light">{description}</p>}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </Panel>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: ReactNode;
  value: ReactNode;
  hint?: ReactNode;
  tone?: "neutral" | "positive" | "warning" | "danger";
}) {
  const toneClasses = {
    neutral: "text-espresso",
    positive: "text-sage",
    warning: "text-amber",
    danger: "text-terracotta",
  }[tone];

  return (
    <Panel className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-espresso-light">{label}</p>
      <p className={cn("mt-2 font-display text-2xl font-medium tabular-nums", toneClasses)}>{value}</p>
      {hint && <p className="mt-1 text-xs text-espresso-light">{hint}</p>}
    </Panel>
  );
}

/** Horizontal scroll container so wide admin tables never break the page layout. */
export function TableWrap({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("w-full overflow-x-auto", className)} {...props} />;
}

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return <table className={cn("w-full min-w-max border-collapse text-sm", className)} {...props} />;
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "border-b border-espresso/10 px-4 py-3 text-start text-xs font-semibold uppercase tracking-wide text-espresso-light",
        className
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td
      className={cn("border-b border-espresso/5 px-4 py-3 align-middle text-espresso", className)}
      {...props}
    />
  );
}

const pillTones = {
  neutral: "bg-espresso/10 text-espresso",
  positive: "bg-sage/20 text-espresso",
  warning: "bg-amber/20 text-espresso",
  danger: "bg-terracotta/20 text-espresso",
  muted: "bg-espresso/5 text-espresso-light",
} as const;

export function Pill({
  tone = "neutral",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof pillTones }) {
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-sm px-2 py-0.5 text-xs font-medium",
        pillTones[tone],
        className
      )}
      {...props}
    />
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <p className="px-5 py-10 text-center text-sm text-espresso-light">{children}</p>;
}

export function Alert({
  tone = "success",
  children,
}: {
  tone?: "success" | "error";
  children: ReactNode;
}) {
  return (
    <p
      role="status"
      className={cn(
        "rounded-sm border px-4 py-2.5 text-sm",
        tone === "success"
          ? "border-sage/40 bg-sage/10 text-espresso"
          : "border-terracotta/40 bg-terracotta/10 text-espresso"
      )}
    >
      {children}
    </p>
  );
}

/** A plain CSS bar — the dashboard's only "chart", so no charting dependency. */
export function BarMeter({ ratio, label }: { ratio: number; label?: string }) {
  const width = Math.max(0, Math.min(1, Number.isFinite(ratio) ? ratio : 0)) * 100;
  return (
    <div
      className="h-2 w-full overflow-hidden rounded-sm bg-espresso/10"
      role="img"
      aria-label={label}
    >
      <div className="h-full rounded-sm bg-amber" style={{ width: `${width}%` }} />
    </div>
  );
}
