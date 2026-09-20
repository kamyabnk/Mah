"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Link, useRouter } from "@/i18n/navigation";
import { EmptyState, Pill, Table, TableWrap, Td, Th } from "@/components/admin/ui";
import { formatDate, formatMoney, formatNumber, localised, type AdminLocale } from "@/lib/admin/format";
import {
  bulkProductAction,
  deleteProduct,
  duplicateProduct,
  type BulkProductAction,
} from "@/lib/admin/products/actions";
import type { AdminProductListRow } from "@/lib/admin/products/queries";

const statusTone = {
  PUBLISHED: "positive",
  DRAFT: "muted",
  ARCHIVED: "danger",
} as const;

export function ProductTable({
  rows,
  locale,
  categories,
}: {
  rows: AdminProductListRow[];
  locale: AdminLocale;
  categories: { id: string; nameEn: string; nameFa: string }[];
}) {
  const t = useTranslations("admin.products");
  const tCommon = useTranslations("admin.common");
  const tStatus = useTranslations("admin.productStatus");
  const router = useRouter();

  const [selected, setSelected] = useState<string[]>([]);
  const [bulkCategoryId, setBulkCategoryId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const allSelected = rows.length > 0 && selected.length === rows.length;

  const toggleAll = () => setSelected(allSelected ? [] : rows.map((row) => row.id));
  const toggleOne = (id: string) =>
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );

  const runBulk = (action: BulkProductAction) => {
    if (selected.length === 0) return;
    if (
      (action === "delete" || action === "archive") &&
      !window.confirm(tCommon("deleteConfirm"))
    ) {
      return;
    }
    if (action === "assignCategory" && !bulkCategoryId) return;

    setError(null);
    startTransition(async () => {
      const result = await bulkProductAction(
        selected,
        action,
        action === "assignCategory" ? bulkCategoryId : undefined
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSelected([]);
      router.refresh();
    });
  };

  const runDelete = (id: string) => {
    if (!window.confirm(tCommon("deleteConfirm"))) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteProduct(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const runDuplicate = (id: string) => {
    setError(null);
    startTransition(async () => {
      const result = await duplicateProduct(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/admin/products/${result.data.id}`);
    });
  };

  if (rows.length === 0) {
    return <EmptyState>{t("noProducts")}</EmptyState>;
  }

  return (
    <div>
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-espresso/10 bg-ivory-dark/50 px-5 py-3">
          <span className="text-sm text-espresso">
            {tCommon("selected", { count: formatNumber(selected.length, locale) })}
          </span>
          <button
            type="button"
            onClick={() => runBulk("publish")}
            disabled={isPending}
            className="rounded-sm border border-espresso/20 px-2.5 py-1 text-xs text-espresso hover:bg-espresso/5 disabled:opacity-50"
          >
            {t("bulkPublish")}
          </button>
          <button
            type="button"
            onClick={() => runBulk("unpublish")}
            disabled={isPending}
            className="rounded-sm border border-espresso/20 px-2.5 py-1 text-xs text-espresso hover:bg-espresso/5 disabled:opacity-50"
          >
            {t("bulkUnpublish")}
          </button>
          <button
            type="button"
            onClick={() => runBulk("archive")}
            disabled={isPending}
            className="rounded-sm border border-espresso/20 px-2.5 py-1 text-xs text-espresso hover:bg-espresso/5 disabled:opacity-50"
          >
            {t("bulkArchive")}
          </button>
          <button
            type="button"
            onClick={() => runBulk("delete")}
            disabled={isPending}
            className="rounded-sm border border-terracotta/40 px-2.5 py-1 text-xs text-terracotta hover:bg-terracotta/10 disabled:opacity-50"
          >
            {t("bulkDelete")}
          </button>

          <span className="ms-auto flex items-center gap-2">
            <select
              value={bulkCategoryId}
              onChange={(event) => setBulkCategoryId(event.target.value)}
              className="h-8 rounded-sm border border-espresso/20 bg-ivory px-2 text-xs text-espresso"
            >
              <option value="">{t("bulkAssignCategory")}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {localised(locale, category.nameEn, category.nameFa)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => runBulk("assignCategory")}
              disabled={isPending || !bulkCategoryId}
              className="rounded-sm border border-espresso/20 px-2.5 py-1 text-xs text-espresso hover:bg-espresso/5 disabled:opacity-50"
            >
              {tCommon("apply")}
            </button>
          </span>
        </div>
      )}

      {error && (
        <p className="border-b border-espresso/10 px-5 py-2 text-sm text-terracotta">
          {error === "UNAUTHORIZED" ? tCommon("unauthorized") : tCommon("unexpectedError")}
        </p>
      )}

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th className="w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label={tCommon("bulkActions")}
                  className="size-4 accent-[var(--color-amber)]"
                />
              </Th>
              <Th>{t("columnProduct")}</Th>
              <Th>{t("columnSku")}</Th>
              <Th>{t("columnPrice")}</Th>
              <Th>{t("columnStock")}</Th>
              <Th>{t("columnStatus")}</Th>
              <Th>{t("columnUpdated")}</Th>
              <Th>{tCommon("actions")}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-ivory-dark/30">
                <Td>
                  <input
                    type="checkbox"
                    checked={selected.includes(row.id)}
                    onChange={() => toggleOne(row.id)}
                    aria-label={localised(locale, row.nameEn, row.nameFa)}
                    className="size-4 accent-[var(--color-amber)]"
                  />
                </Td>
                <Td>
                  <div className="flex items-center gap-3">
                    {row.primaryImage ? (
                      <Image
                        src={row.primaryImage}
                        alt=""
                        width={40}
                        height={40}
                        className="size-10 shrink-0 rounded-sm object-cover"
                      />
                    ) : (
                      <span className="size-10 shrink-0 rounded-sm bg-espresso/5" />
                    )}
                    <span className="min-w-0">
                      <Link
                        href={`/admin/products/${row.id}`}
                        className="block max-w-[18rem] truncate font-medium text-amber underline"
                      >
                        {localised(locale, row.nameEn, row.nameFa)}
                      </Link>
                      {row.hasVariants && (
                        <span className="text-xs text-espresso-light">
                          {t("variantsBadge", { count: formatNumber(row.variantCount, locale) })}
                        </span>
                      )}
                    </span>
                  </div>
                </Td>
                <Td className="whitespace-nowrap text-xs text-espresso-light">{row.sku}</Td>
                <Td className="whitespace-nowrap tabular-nums">
                  {row.salePrice !== null ? (
                    <>
                      <span className="text-terracotta">{formatMoney(row.salePrice, locale)}</span>{" "}
                      <s className="text-xs text-espresso-light">{formatMoney(row.price, locale)}</s>
                    </>
                  ) : (
                    formatMoney(row.price, locale)
                  )}
                </Td>
                <Td className="tabular-nums">
                  <Pill
                    tone={
                      row.stockQuantity === 0
                        ? "danger"
                        : row.stockQuantity <= row.lowStockThreshold
                          ? "warning"
                          : "muted"
                    }
                  >
                    {formatNumber(row.stockQuantity, locale)}
                  </Pill>
                </Td>
                <Td>
                  <Pill tone={statusTone[row.status]}>{tStatus(row.status)}</Pill>
                </Td>
                <Td className="whitespace-nowrap text-xs text-espresso-light">
                  {formatDate(row.updatedAt, locale)}
                </Td>
                <Td>
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <Link href={`/admin/products/${row.id}`} className="text-xs text-amber underline">
                      {tCommon("edit")}
                    </Link>
                    <button
                      type="button"
                      onClick={() => runDuplicate(row.id)}
                      disabled={isPending}
                      className="text-xs text-espresso-light underline disabled:opacity-50"
                    >
                      {tCommon("duplicate")}
                    </button>
                    <button
                      type="button"
                      onClick={() => runDelete(row.id)}
                      disabled={isPending}
                      className="text-xs text-terracotta underline disabled:opacity-50"
                    >
                      {tCommon("delete")}
                    </button>
                  </div>
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </TableWrap>
    </div>
  );
}
