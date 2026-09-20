"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Panel, PanelHeader } from "@/components/admin/ui";
import { Button } from "@/components/ui/button";
import {
  assignProductToCategory,
  removeProductFromCategory,
} from "@/lib/admin/categories/actions";
import { localised, type AdminLocale } from "@/lib/admin/format";

interface ProductOption {
  id: string;
  nameEn: string;
  nameFa: string;
  sku: string;
}

export function CategoryProducts({
  categoryId,
  locale,
  assigned,
  assignable,
}: {
  categoryId: string;
  locale: AdminLocale;
  assigned: ProductOption[];
  assignable: ProductOption[];
}) {
  const t = useTranslations("admin.categories.assign");
  const tCommon = useTranslations("admin.common");
  const router = useRouter();
  const [selectedId, setSelectedId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = (operation: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await operation();
      if (!result.ok) {
        setError(
          result.error === "UNAUTHORIZED" ? tCommon("unauthorized") : tCommon("unexpectedError")
        );
        return;
      }
      setSelectedId("");
      router.refresh();
    });
  };

  return (
    <Panel>
      <PanelHeader title={t("title")} />

      <div className="flex flex-wrap items-end gap-2 border-b border-espresso/10 p-5">
        <label className="flex min-w-56 flex-1 flex-col gap-1.5">
          <span className="text-sm font-medium text-espresso">{t("add")}</span>
          <select
            value={selectedId}
            onChange={(event) => setSelectedId(event.target.value)}
            className="h-10 w-full rounded-sm border border-espresso/20 bg-ivory px-2 text-sm text-espresso"
          >
            <option value="">{t("placeholder")}</option>
            {assignable.map((product) => (
              <option key={product.id} value={product.id}>
                {localised(locale, product.nameEn, product.nameFa)} · {product.sku}
              </option>
            ))}
          </select>
        </label>
        <Button
          type="button"
          size="sm"
          disabled={isPending || !selectedId}
          onClick={() => run(() => assignProductToCategory(categoryId, selectedId))}
        >
          {tCommon("add")}
        </Button>
      </div>

      {error && <p className="px-5 py-2 text-sm text-terracotta">{error}</p>}

      {assigned.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-espresso-light">{t("empty")}</p>
      ) : (
        <ul className="divide-y divide-espresso/5">
          {assigned.map((product) => (
            <li key={product.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <Link
                  href={`/admin/products/${product.id}`}
                  className="block truncate text-sm text-amber underline"
                >
                  {localised(locale, product.nameEn, product.nameFa)}
                </Link>
                <span className="text-xs text-espresso-light">{product.sku}</span>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={() => run(() => removeProductFromCategory(categoryId, product.id))}
                className="shrink-0 text-xs text-terracotta underline disabled:opacity-50"
              >
                {t("remove")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
