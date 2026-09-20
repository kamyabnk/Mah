import type { OrderStatus } from "@prisma/client";
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
import { listAdminOrders, ORDERS_PAGE_SIZE, type OrderSort } from "@/lib/admin/orders/queries";
import { requireAdminPagePermission } from "@/lib/admin/session";
import { formatDate, formatMoney, formatNumber, type AdminLocale } from "@/lib/admin/format";

const STATUSES: OrderStatus[] = [
  "PENDING",
  "PAYMENT_PENDING",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
  "RETURNED",
];

const SORTS: OrderSort[] = ["newest", "oldest", "totalDesc", "totalAsc"];

const statusTone: Record<OrderStatus, "positive" | "warning" | "danger" | "muted" | "neutral"> = {
  PENDING: "warning",
  PAYMENT_PENDING: "warning",
  PAID: "neutral",
  PROCESSING: "neutral",
  SHIPPED: "neutral",
  DELIVERED: "positive",
  CANCELLED: "danger",
  REFUNDED: "danger",
  RETURNED: "danger",
};

export default async function AdminOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: rawLocale } = await params;
  const locale: AdminLocale = rawLocale === "fa" ? "fa" : "en";
  await requireAdminPagePermission(rawLocale, "orders.manage");

  const query = await searchParams;
  const first = (key: string) => {
    const value = query[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const search = first("q")?.trim() || undefined;
  const rawStatus = first("status");
  const status = STATUSES.includes(rawStatus as OrderStatus)
    ? (rawStatus as OrderStatus)
    : undefined;
  const from = first("from") || undefined;
  const to = first("to") || undefined;
  const rawSort = first("sort");
  const sort: OrderSort = SORTS.includes(rawSort as OrderSort) ? (rawSort as OrderSort) : "newest";
  const page = Math.max(1, Number(first("page") ?? 1) || 1);

  const t = await getTranslations({ locale: rawLocale, namespace: "admin.orders" });
  const tCommon = await getTranslations({ locale: rawLocale, namespace: "admin.common" });
  const tStatus = await getTranslations({ locale: rawLocale, namespace: "orderStatus" });
  const tPayment = await getTranslations({ locale: rawLocale, namespace: "admin.paymentStatus" });

  const result = await listAdminOrders({ search, status, from, to, sort, page });
  const fromIndex = result.total === 0 ? 0 : (result.page - 1) * ORDERS_PAGE_SIZE + 1;
  const toIndex = Math.min(result.page * ORDERS_PAGE_SIZE, result.total);

  const controlClasses =
    "h-10 rounded-sm border border-espresso/20 bg-ivory px-2 text-sm text-espresso";

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title={t("title")} description={t("subtitle")} />

      <Panel className="p-4">
        <form className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-48 flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-espresso-light">{tCommon("search")}</span>
            <input
              type="search"
              name="q"
              defaultValue={search ?? ""}
              placeholder={t("searchPlaceholder")}
              className={`${controlClasses} w-full px-3`}
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-espresso-light">{t("filterStatus")}</span>
            <select name="status" defaultValue={status ?? ""} className={controlClasses}>
              <option value="">{tCommon("all")}</option>
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {tStatus(value)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-espresso-light">{t("filterFrom")}</span>
            <input type="date" name="from" defaultValue={from ?? ""} className={controlClasses} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-espresso-light">{t("filterTo")}</span>
            <input type="date" name="to" defaultValue={to ?? ""} className={controlClasses} />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-espresso-light">{tCommon("filter")}</span>
            <select name="sort" defaultValue={sort} className={controlClasses}>
              <option value="newest">{t("sortNewest")}</option>
              <option value="oldest">{t("sortOldest")}</option>
              <option value="totalDesc">{t("sortTotalDesc")}</option>
              <option value="totalAsc">{t("sortTotalAsc")}</option>
            </select>
          </label>
          <button
            type="submit"
            className="h-10 rounded-sm bg-espresso px-4 text-sm font-medium text-ivory hover:bg-espresso/90"
          >
            {tCommon("apply")}
          </button>
          <Link
            href="/admin/orders"
            className="h-10 rounded-sm border border-espresso/20 px-4 text-sm leading-10 text-espresso hover:bg-espresso/5"
          >
            {tCommon("reset")}
          </Link>
        </form>
      </Panel>

      <Panel>
        {result.rows.length === 0 ? (
          <EmptyState>{t("noOrders")}</EmptyState>
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>{t("columnOrder")}</Th>
                  <Th>{t("columnCustomer")}</Th>
                  <Th>{t("columnDate")}</Th>
                  <Th>{t("columnItems")}</Th>
                  <Th>{t("columnTotal")}</Th>
                  <Th>{t("columnStatus")}</Th>
                  <Th>{t("columnPayment")}</Th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={row.id} className="hover:bg-ivory-dark/30">
                    <Td>
                      <Link
                        href={`/admin/orders/${row.id}`}
                        className="font-mono text-xs font-medium text-amber underline"
                      >
                        {row.orderNumber}
                      </Link>
                    </Td>
                    <Td>
                      <span className="block text-sm">{row.customerName ?? t("guest")}</span>
                      <span className="block text-xs text-espresso-light">
                        {row.customerEmail ?? row.guestEmail ?? "—"}
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap text-xs text-espresso-light">
                      {formatDate(row.createdAt, locale)}
                    </Td>
                    <Td className="tabular-nums">{formatNumber(row.itemCount, locale)}</Td>
                    <Td className="whitespace-nowrap tabular-nums">
                      {formatMoney(row.grandTotal, locale)}
                    </Td>
                    <Td>
                      <Pill tone={statusTone[row.status]}>{tStatus(row.status)}</Pill>
                    </Td>
                    <Td className="text-xs text-espresso-light">
                      {row.paymentStatus ? tPayment(row.paymentStatus) : "—"}
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
          pageSize={ORDERS_PAGE_SIZE}
          basePath="/admin/orders"
          params={{ q: search, status, from, to, sort: sort === "newest" ? undefined : sort }}
          labels={{
            previous: tCommon("previous"),
            next: tCommon("next"),
            showing: tCommon("showing", {
              from: formatNumber(fromIndex, locale),
              to: formatNumber(toIndex, locale),
              total: formatNumber(result.total, locale),
            }),
          }}
        />
      </Panel>
    </div>
  );
}
