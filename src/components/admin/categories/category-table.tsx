"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/navigation";
import { EmptyState, Pill, Table, TableWrap, Td, Th } from "@/components/admin/ui";
import { formatNumber, localised, type AdminLocale } from "@/lib/admin/format";
import {
  deleteCategory,
  moveCategory,
  setCategoryActive,
} from "@/lib/admin/categories/actions";
import type { AdminCategoryRow } from "@/lib/admin/categories/queries";

export function CategoryTable({
  rows,
  locale,
}: {
  rows: AdminCategoryRow[];
  locale: AdminLocale;
}) {
  const t = useTranslations("admin.categories");
  const tErrors = useTranslations("admin.categories.errors");
  const tCommon = useTranslations("admin.common");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (operation: () => Promise<{ ok: boolean; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await operation();
      if (!result.ok) {
        const code = result.error ?? "";
        setError(
          code === "UNAUTHORIZED"
            ? tCommon("unauthorized")
            : tErrors.has(code)
              ? tErrors(code)
              : tCommon("unexpectedError")
        );
        return;
      }
      router.refresh();
    });
  };

  if (rows.length === 0) return <EmptyState>{t("noCategories")}</EmptyState>;

  return (
    <div>
      {error && <p className="border-b border-espresso/10 px-5 py-2 text-sm text-terracotta">{error}</p>}
      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>{t("columnCategory")}</Th>
              <Th>{t("columnParent")}</Th>
              <Th>{t("columnProducts")}</Th>
              <Th>{t("columnOrder")}</Th>
              <Th>{t("columnActive")}</Th>
              <Th>{tCommon("actions")}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => {
              const prev = rows[index - 1];
              const next = rows[index + 1];
              // Move buttons only make sense between siblings.
              const canMoveUp = Boolean(prev && prev.parentId === row.parentId);
              const canMoveDown = Boolean(next && next.parentId === row.parentId);

              return (
                <tr key={row.id} className="hover:bg-ivory-dark/30">
                  <Td>
                    <div
                      className="flex items-center gap-3"
                      style={{ paddingInlineStart: `${row.depth * 1.25}rem` }}
                    >
                      {row.image ? (
                        <Image
                          src={row.image}
                          alt=""
                          width={32}
                          height={32}
                          className="size-8 shrink-0 rounded-sm object-cover"
                        />
                      ) : (
                        <span className="size-8 shrink-0 rounded-sm bg-espresso/5" />
                      )}
                      <Link
                        href={`/admin/categories/${row.id}`}
                        className="font-medium text-amber underline"
                      >
                        {localised(locale, row.nameEn, row.nameFa)}
                      </Link>
                    </div>
                  </Td>
                  <Td className="text-xs text-espresso-light">
                    {row.parentNameEn
                      ? localised(locale, row.parentNameEn, row.parentNameFa ?? row.parentNameEn)
                      : "—"}
                  </Td>
                  <Td className="tabular-nums">{formatNumber(row.productCount, locale)}</Td>
                  <Td className="tabular-nums text-xs text-espresso-light">
                    {formatNumber(row.sortOrder, locale)}
                  </Td>
                  <Td>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => run(() => setCategoryActive(row.id, !row.isActive))}
                      className="disabled:opacity-50"
                    >
                      <Pill tone={row.isActive ? "positive" : "muted"}>
                        {row.isActive ? tCommon("yes") : tCommon("no")}
                      </Pill>
                    </button>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-2 whitespace-nowrap text-xs">
                      <Link href={`/admin/categories/${row.id}`} className="text-amber underline">
                        {tCommon("edit")}
                      </Link>
                      <button
                        type="button"
                        disabled={isPending || !canMoveUp}
                        onClick={() => run(() => moveCategory(row.id, "up"))}
                        className="text-espresso-light underline disabled:opacity-30"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        disabled={isPending || !canMoveDown}
                        onClick={() => run(() => moveCategory(row.id, "down"))}
                        className="text-espresso-light underline disabled:opacity-30"
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => {
                          if (window.confirm(tCommon("deleteConfirm"))) {
                            run(() => deleteCategory(row.id));
                          }
                        }}
                        className="text-terracotta underline disabled:opacity-50"
                      >
                        {tCommon("delete")}
                      </button>
                    </div>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </TableWrap>
    </div>
  );
}
