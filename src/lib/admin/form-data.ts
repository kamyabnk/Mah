/** Small typed readers for `FormData`, shared by every admin form action. */

/** Trimmed string, or `null` when absent/blank — matches nullable Prisma columns. */
export function readString(formData: FormData, key: string): string | null {
  const value = formData.get(key);
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/** Trimmed string, always present (may be ""), for required columns. */
export function readRequiredString(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function readNumber(formData: FormData, key: string): number | null {
  const raw = readString(formData, key);
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function readInt(formData: FormData, key: string, fallback = 0): number {
  const parsed = readNumber(formData, key);
  return parsed === null ? fallback : Math.trunc(parsed);
}

/** Unchecked checkboxes are simply absent from the payload. */
export function readBoolean(formData: FormData, key: string): boolean {
  return formData.get(key) !== null;
}

export function readStringList(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value !== "");
}

/** Normalises a slug the same way for products and categories. */
export function normaliseSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}
