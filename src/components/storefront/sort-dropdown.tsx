"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import type { SortOption } from "@/lib/catalog/list-products";

const OPTIONS: SortOption[] = ["featured", "newest", "bestselling", "price-asc", "price-desc", "rating"];

export function SortDropdown() {
  const t = useTranslations("sort");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const current = (searchParams.get("sort") as SortOption | null) ?? "featured";

  return (
    <label className="flex items-center gap-2 text-sm text-espresso">
      {t("label")}
      <select
        value={current}
        onChange={(event) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set("sort", event.target.value);
          params.delete("page");
          router.push(`${pathname}?${params.toString()}`);
        }}
        className="rounded-sm border border-espresso/20 bg-ivory px-3 py-2"
      >
        {OPTIONS.map((option) => (
          <option key={option} value={option}>
            {t(option === "price-asc" ? "priceAsc" : option === "price-desc" ? "priceDesc" : option)}
          </option>
        ))}
      </select>
    </label>
  );
}
