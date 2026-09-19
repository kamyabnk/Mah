"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { Input } from "@/components/ui/input";
import { getAutocompleteSuggestions } from "@/lib/catalog/autocomplete-action";
import type { AutocompleteSuggestion } from "@/lib/catalog/search-products";

export function SearchBox({ locale, initialQuery = "" }: { locale: "en" | "fa"; initialQuery?: string }) {
  const t = useTranslations("search");
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const handle = setTimeout(() => {
      startTransition(async () => {
        if (query.trim().length < 2) {
          setSuggestions([]);
          return;
        }
        const results = await getAutocompleteSuggestions(locale, query);
        setSuggestions(results);
      });
    }, 250);
    return () => clearTimeout(handle);
  }, [query, locale]);

  return (
    <div className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          router.push(`/search?q=${encodeURIComponent(query)}`);
        }}
      >
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("placeholder")}
          className="w-full"
        />
      </form>
      {suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-sm border border-espresso/15 bg-ivory shadow-sm">
          {suggestions.map((s) => (
            <Link
              key={s.id}
              href={`/product/${s.slug}`}
              className="block px-4 py-2 text-sm text-espresso hover:bg-espresso/5"
            >
              {s.name}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
