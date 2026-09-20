import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  AdminPageHeader,
  EmptyState,
  Panel,
  Pill,
  Table,
  TableWrap,
  Td,
  Th,
} from "@/components/admin/ui";
import { AdminPagination } from "@/components/admin/pagination";
import {
  getTransactionFilterProducts,
  listInventoryTransactions,
  TRANSACTIONS_PAGE_SIZE,
} from "@/lib/admin/inventory/queries";
import { requireAdminPagePermission } from "@/lib/admin/session";
import { formatDateTime, formatNumber, localised, type AdminLocale } from "@/lib/admin/format";

export default async function InventoryTransactionsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: rawLocale } = await params;
  const locale: AdminLocale = rawLocale === "fa" ? "fa" : "en";
  await requireAdminPagePermission(rawLocale, "inventory.manage");

  const query = await searchParams;
  const first = (key: string) => {
    const value = query[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const productId = first("product") || undefined;
  const page = Math.max(1, Number(first("page") ?? 1) || 1);

  const t = await getTranslations({ locale: rawLocale, namespace: "admin.inventory.transactions" });
  const tCommon = await getTranslations({ locale: rawLocale, namespace: "admin.common" });
  const tType = await getTranslations({ locale: rawLocale, namespace: "admin.inventoryType" });

  const [result, products] = await Promise.all([
    listInventoryTransactions(productId, page),
    getTransactionFilterProducts(),
  ]);

  const from = result.total === 0 ? 0 : (result.page - 1) * TRANSACTIONS_PAGE_SIZE + 1;
  const to = Math.min(result.page * TRANSACTIONS_PAGE_SIZE, result.total);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Link href="/admin/inventory" className="text-sm text-espresso-light underline">
            {tCommon("back")}
          </Link>
        }
      />

      <Panel className="p-4">
        <form className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-56 flex-col gap-1.5">
            <span className="text-xs font-medium text-espresso-light">{t("filterProduct")}</span>
            <select
              name="product"
              defaultValue={productId ?? ""}
              className="h-10 rounded-sm border border-espresso/20 bg-ivory px-2 text-sm text-espresso"
            >
              <option value="">{t("allProducts")}</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {localised(locale, product.nameEn, product.nameFa)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="h-10 rounded-sm bg-espresso px-4 text-sm font-medium text-ivory hover:bg-espresso/90"
          >
            {tCommon("filter")}
          </button>
          <Link
            href="/admin/inventory/transactions"
            className="h-10 rounded-sm border border-espresso/20 px-4 text-sm leading-10 text-espresso hover:bg-espresso/5"
          >
            {tCommon("reset")}
          </Link>
        </form>
      </Panel>

      <Panel>
        {result.rows.length === 0 ? (
          <EmptyState>{t("empty")}</EmptyState>
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>{t("columnDate")}</Th>
                  <Th>{t("columnItem")}</Th>
                  <Th>{t("columnType")}</Th>
                  <Th>{t("columnChange")}</Th>
                  <Th>{t("columnResulting")}</Th>
                  <Th>{t("columnNote")}</Th>
                  <Th>{t("columnAdmin")}</Th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={row.id}>
                    <Td className="whitespace-nowrap text-xs text-espresso-light">
                      {formatDateTime(row.createdAt, locale)}
                    </Td>
                    <Td>
                      <Link
                        href={`/admin/products/${row.productId}`}
                        className="text-amber underline"
                      >
                        {localised(locale, row.productNameEn, row.productNameFa)}
                      </Link>
                      {row.variantNameEn && (
                        <span className="block text-xs text-espresso-light">
                          {localised(locale, row.variantNameEn, row.variantNameFa ?? row.variantNameEn)}
                        </span>
                      )}
                    </Td>
                    <Td>
                      <Pill
                        tone={
                          row.type === "SALE"
                            ? "muted"
                            : row.type === "MANUAL_ADJUSTMENT"
                              ? "warning"
                              : "positive"
                        }
                      >
                        {tType(row.type)}
                      </Pill>
                    </Td>
                    <Td
                      className={
                        row.quantityChange < 0
                          ? "tabular-nums text-terracotta"
                          : "tabular-nums text-sage"
                      }
                    >
                      {row.quantityChange > 0 ? "+" : ""}
                      {formatNumber(row.quantityChange, locale)}
                    </Td>
                    <Td className="tabular-nums">{formatNumber(row.resultingQuantity, locale)}</Td>
                    <Td className="max-w-64 text-xs text-espresso-light">
                      {row.note ?? "—"}
                      {row.orderNumber && (
                        <span className="block font-mono text-[0.7rem]">{row.orderNumber}</span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-xs text-espresso-light">
                      {row.adminName ?? t("system")}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}

        <AdminPagination
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          pageSize={TRANSACTIONS_PAGE_SIZE}
          basePath="/admin/inventory/transactions"
          params={{ product: productId }}
          labels={{
            previous: tCommon("previous"),
            next: tCommon("next"),
            showing: tCommon("showing", {
              from: formatNumber(from, locale),
              to: formatNumber(to, locale),
              total: formatNumber(result.total, locale),
            }),
          }}
        />
      </Panel>
    </div>
  );
}
