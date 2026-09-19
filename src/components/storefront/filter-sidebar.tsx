"use client";

import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";

interface FragranceOption {
  id: string;
  slug: string;
  name: string;
}

export function FilterSidebar({ fragrances }: { fragrances: FragranceOption[] }) {
  const t = useTranslations("filters");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === null || value === "") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggleFlag(key: string) {
    setParam(key, searchParams.get(key) ? null : "1");
  }

  return (
    <aside className="flex w-full flex-col gap-6 sm:w-64">
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-espresso">{t("price")}</span>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            defaultValue={searchParams.get("minPrice") ?? ""}
            placeholder="0"
            onBlur={(e) => setParam("minPrice", e.target.value)}
          />
          <span>–</span>
          <Input
            type="number"
            defaultValue={searchParams.get("maxPrice") ?? ""}
            placeholder="∞"
            onBlur={(e) => setParam("maxPrice", e.target.value)}
          />
        </div>
      </div>

      {fragrances.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-espresso">{t("fragrance")}</span>
          <select
            value={searchParams.get("fragrance") ?? ""}
            onChange={(e) => setParam("fragrance", e.target.value || null)}
            className="rounded-sm border border-espresso/20 bg-ivory px-3 py-2 text-sm"
          >
            <option value="">{t("fragrance")}</option>
            {fragrances.map((f) => (
              <option key={f.id} value={f.slug}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-espresso">{t("availability")}</span>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={Boolean(searchParams.get("inStock"))} onChange={() => toggleFlag("inStock")} />
          {t("inStockOnly")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(searchParams.get("bestSeller"))}
            onChange={() => toggleFlag("bestSeller")}
          />
          {t("bestSeller")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={Boolean(searchParams.get("newArrival"))}
            onChange={() => toggleFlag("newArrival")}
          />
          {t("newArrival")}
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={Boolean(searchParams.get("onSale"))} onChange={() => toggleFlag("onSale")} />
          {t("onSale")}
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium text-espresso">{t("rating")}</span>
        <select
          value={searchParams.get("minRating") ?? ""}
          onChange={(e) => setParam("minRating", e.target.value || null)}
          className="rounded-sm border border-espresso/20 bg-ivory px-3 py-2 text-sm"
        >
          <option value="">{t("rating")}</option>
          {[4, 3, 2, 1].map((r) => (
            <option key={r} value={r}>
              {r}+
            </option>
          ))}
        </select>
      </div>

      <button type="button" onClick={() => router.push(pathname)} className="text-left text-sm text-amber underline">
        {t("clear")}
      </button>
    </aside>
  );
}
