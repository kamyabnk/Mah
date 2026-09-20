import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { cn } from "@/lib/cn";
import { Input } from "@/components/ui/input";

const controlClasses =
  "w-full rounded-sm border border-espresso/20 bg-ivory px-3 py-2 text-sm text-espresso focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber";

export function Field({
  label,
  htmlFor,
  error,
  hint,
  className,
  children,
}: {
  label?: ReactNode;
  htmlFor?: string;
  error?: string;
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={htmlFor} className="text-sm font-medium text-espresso">
          {label}
        </label>
      )}
      {children}
      {hint && <p className="text-xs text-espresso-light">{hint}</p>}
      {error && <p className="text-xs text-terracotta">{error}</p>}
    </div>
  );
}

export interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  error?: string;
  hint?: ReactNode;
  wrapperClassName?: string;
}

export function TextField({ label, error, hint, wrapperClassName, ...props }: TextFieldProps) {
  const id = props.id ?? props.name;
  return (
    <Field label={label} htmlFor={id} error={error} hint={hint} className={wrapperClassName}>
      <Input id={id} className="h-10 px-3 text-sm" {...props} />
    </Field>
  );
}

export interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  error?: string;
  hint?: ReactNode;
  wrapperClassName?: string;
}

export function TextAreaField({
  label,
  error,
  hint,
  wrapperClassName,
  className,
  rows = 4,
  ...props
}: TextAreaFieldProps) {
  const id = props.id ?? props.name;
  return (
    <Field label={label} htmlFor={id} error={error} hint={hint} className={wrapperClassName}>
      <textarea id={id} rows={rows} className={cn(controlClasses, className)} {...props} />
    </Field>
  );
}

export interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  error?: string;
  hint?: ReactNode;
  wrapperClassName?: string;
}

export function SelectField({
  label,
  error,
  hint,
  wrapperClassName,
  className,
  children,
  ...props
}: SelectFieldProps) {
  const id = props.id ?? props.name;
  return (
    <Field label={label} htmlFor={id} error={error} hint={hint} className={wrapperClassName}>
      <select id={id} className={cn(controlClasses, "h-10 py-0", className)} {...props}>
        {children}
      </select>
    </Field>
  );
}

export interface CheckboxFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: ReactNode;
}

export function CheckboxField({ label, className, ...props }: CheckboxFieldProps) {
  const id = props.id ?? props.name;
  return (
    <label
      htmlFor={id}
      className={cn("flex cursor-pointer items-center gap-2 text-sm text-espresso", className)}
    >
      <input
        id={id}
        type="checkbox"
        className="size-4 accent-[var(--color-amber)]"
        {...props}
      />
      {label}
    </label>
  );
}

/** Multi-select rendered as a scrollable checkbox list — friendlier than `<select multiple>`. */
export function CheckboxGroup({
  label,
  name,
  options,
  selected,
  emptyLabel,
  className,
}: {
  label: ReactNode;
  name: string;
  options: { value: string; label: string }[];
  selected: string[];
  emptyLabel: ReactNode;
  className?: string;
}) {
  return (
    <Field label={label} className={className}>
      {options.length === 0 ? (
        <p className="text-xs text-espresso-light">{emptyLabel}</p>
      ) : (
        <div className="max-h-48 overflow-y-auto rounded-sm border border-espresso/20 bg-ivory p-2">
          {options.map((option) => (
            <CheckboxField
              key={option.value}
              id={`${name}-${option.value}`}
              name={name}
              value={option.value}
              label={option.label}
              defaultChecked={selected.includes(option.value)}
              className="px-1 py-1"
            />
          ))}
        </div>
      )}
    </Field>
  );
}
