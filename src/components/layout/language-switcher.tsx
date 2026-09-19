"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";

export function LanguageSwitcher() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = locale === "fa" ? "en" : "fa";
  const query = searchParams.toString();

  return (
    <button
      type="button"
      onClick={() => router.replace(`${pathname}${query ? `?${query}` : ""}`, { locale: next })}
      className="text-sm font-medium text-espresso"
      aria-label="Switch language"
    >
      {next === "fa" ? "فا" : "EN"}
    </button>
  );
}
