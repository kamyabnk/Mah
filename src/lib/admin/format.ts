export type AdminLocale = "en" | "fa";

type DecimalLike = { toString(): string } | number | string | null | undefined;

/** Prisma Decimal columns arrive as objects; normalise them to a plain number. */
export function toNumber(value: DecimalLike): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const parsed = Number(value.toString());
  return Number.isFinite(parsed) ? parsed : 0;
}

export function toNullableNumber(value: DecimalLike): number | null {
  if (value === null || value === undefined) return null;
  return toNumber(value);
}

/** Prices are whole Toman; Persian renders with Persian digits and separators. */
export function formatMoney(value: DecimalLike, locale: AdminLocale): string {
  return new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-US", {
    maximumFractionDigits: 0,
  }).format(toNumber(value));
}

export function formatNumber(value: number, locale: AdminLocale): string {
  return new Intl.NumberFormat(locale === "fa" ? "fa-IR" : "en-US").format(value);
}

/** Persian admins see Jalali dates — `fa-IR` defaults to the Persian calendar. */
export function formatDate(value: Date | string, locale: AdminLocale): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatDateTime(value: Date | string, locale: AdminLocale): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale === "fa" ? "fa-IR" : "en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** `<input type="date">` needs an un-localised ISO day. */
export function toDateInputValue(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function localised<T>(locale: AdminLocale, en: T, fa: T): T {
  return locale === "fa" ? fa : en;
}
