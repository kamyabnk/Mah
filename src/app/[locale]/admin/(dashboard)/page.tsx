import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  AdminPageHeader,
  BarMeter,
  EmptyState,
  Panel,
  PanelHeader,
  Pill,
  StatCard,
  Table,
  TableWrap,
  Td,
  Th,
} from "@/components/admin/ui";
import { getDashboardData } from "@/lib/admin/dashboard/queries";
import { formatDate, formatMoney, formatNumber, localised, type AdminLocale } from "@/lib/admin/format";
import { requireAdminPage } from "@/lib/admin/session";
import { hasPermission } from "@/lib/auth/permissions";

/**
 * The storefront's `[locale]/layout.tsx` supplies `generateStaticParams`, and
 * this page takes no `searchParams`, so Next.js would otherwise add /en/admin
 * and /fa/admin to the prerender list — a per-admin dashboard must never be
 * statically generated or cached. Declaring it here (not only on the layout) is
 * what actually keeps it out of the build-time static list.
 */
export const dynamic = "force-dynamic";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: AdminLocale = rawLocale === "fa" ? "fa" : "en";
  const session = await requireAdminPage(rawLocale);

  const t = await getTranslations({ locale: rawLocale, namespace: "admin.dashboard" });
  const tStatus = await getTranslations({ locale: rawLocale, namespace: "orderStatus" });
  const tCommon = await getTranslations({ locale: rawLocale, namespace: "admin.common" });
  const tOrders = await getTranslations({ locale: rawLocale, namespace: "admin.orders" });

  const data = await getDashboardData();
  const canSeeOrders = hasPermission(session.permissions, "orders.manage");
  const canSeeCustomers = hasPermission(session.permissions, "customers.view");
  const canSeeInventory = hasPermission(session.permissions, "inventory.manage");

  const peakDay = Math.max(1, ...data.salesByDay.map((day) => day.total));
  const bestSellerPeak = Math.max(1, ...data.bestSellers.map((item) => item.quantity));

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title={t("title")} description={t("subtitle")} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label={t("totalSales")}
          value={`${formatMoney(data.totalSales, locale)} ${tCommon("currency")}`}
          hint={t("salesNote")}
        />
        <StatCard
          label={t("todaySales")}
          value={`${formatMoney(data.todaySales, locale)} ${tCommon("currency")}`}
        />
        <StatCard
          label={t("monthSales")}
          value={`${formatMoney(data.monthSales, locale)} ${tCommon("currency")}`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("totalOrders")} value={formatNumber(data.orderCounts.total, locale)} />
        <StatCard
          label={t("pendingOrders")}
          value={formatNumber(data.orderCounts.pending, locale)}
          tone="warning"
        />
        <StatCard
          label={t("completedOrders")}
          value={formatNumber(data.orderCounts.completed, locale)}
          tone="positive"
        />
        <StatCard
          label={t("cancelledOrders")}
          value={formatNumber(data.orderCounts.cancelled, locale)}
          tone="danger"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("totalCustomers")} value={formatNumber(data.totalCustomers, locale)} />
        <StatCard label={t("totalProducts")} value={formatNumber(data.totalProducts, locale)} />
        <StatCard
          label={t("lowStock")}
          value={formatNumber(data.lowStockCount, locale)}
          tone="warning"
        />
        <StatCard
          label={t("outOfStock")}
          value={formatNumber(data.outOfStockCount, locale)}
          tone="danger"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <PanelHeader title={t("last7Days")} />
          <div className="flex flex-col gap-3 p-5">
            {data.salesByDay.every((day) => day.total === 0) ? (
              <p className="text-sm text-espresso-light">{t("noSales")}</p>
            ) : (
              data.salesByDay.map((day) => (
                <div key={day.date.toISOString()} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-3 text-xs text-espresso-light">
                    <span>{formatDate(day.date, locale)}</span>
                    <span className="tabular-nums">{formatMoney(day.total, locale)}</span>
                  </div>
                  <BarMeter ratio={day.total / peakDay} />
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel>
          <PanelHeader title={t("bestSellers")} />
          {data.bestSellers.length === 0 ? (
            <EmptyState>{t("noSales")}</EmptyState>
          ) : (
            <div className="flex flex-col gap-3 p-5">
              {data.bestSellers.map((item) => (
                <div key={item.productId} className="flex flex-col gap-1">
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="truncate text-espresso">
                      {localised(locale, item.nameEn, item.nameFa)}
                    </span>
                    <span className="shrink-0 text-xs text-espresso-light">
                      {t("unitsSold", { count: formatNumber(item.quantity, locale) })}
                    </span>
                  </div>
                  <BarMeter ratio={item.quantity / bestSellerPeak} />
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel>
          <PanelHeader
            title={t("recentOrders")}
            actions={
              canSeeOrders && (
                <Link href="/admin/orders" className="text-sm text-amber underline">
                  {t("viewAll")}
                </Link>
              )
            }
          />
          {data.recentOrders.length === 0 ? (
            <EmptyState>{tCommon("noResults")}</EmptyState>
          ) : (
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>{tOrders("columnOrder")}</Th>
                    <Th>{tCommon("status")}</Th>
                    <Th>{tCommon("total")}</Th>
                    <Th>{tCommon("date")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentOrders.map((order) => (
                    <tr key={order.id}>
                      <Td>
                        {canSeeOrders ? (
                          <Link
                            href={`/admin/orders/${order.id}`}
                            className="font-medium text-amber underline"
                          >
                            {order.orderNumber}
                          </Link>
                        ) : (
                          <span className="font-medium">{order.orderNumber}</span>
                        )}
                        <span className="block text-xs text-espresso-light">
                          {order.customerName ?? order.guestEmail ?? "—"}
                        </span>
                      </Td>
                      <Td>
                        <Pill>{tStatus(order.status)}</Pill>
                      </Td>
                      <Td className="tabular-nums">{formatMoney(order.grandTotal, locale)}</Td>
                      <Td className="whitespace-nowrap text-xs text-espresso-light">
                        {formatDate(order.createdAt, locale)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>
          )}
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel>
            <PanelHeader
              title={t("recentCustomers")}
              actions={
                canSeeCustomers && (
                  <Link href="/admin/customers" className="text-sm text-amber underline">
                    {t("viewAll")}
                  </Link>
                )
              }
            />
            {data.recentCustomers.length === 0 ? (
              <EmptyState>{tCommon("noResults")}</EmptyState>
            ) : (
              <ul className="divide-y divide-espresso/5">
                {data.recentCustomers.map((customer) => (
                  <li key={customer.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-espresso">
                        {customer.firstName} {customer.lastName}
                      </p>
                      <p className="truncate text-xs text-espresso-light">{customer.email}</p>
                    </div>
                    <span className="shrink-0 text-xs text-espresso-light">
                      {formatDate(customer.createdAt, locale)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <PanelHeader
              title={t("lowStockProducts")}
              actions={
                canSeeInventory && (
                  <Link href="/admin/inventory?view=low" className="text-sm text-amber underline">
                    {t("viewAll")}
                  </Link>
                )
              }
            />
            {data.stockAttention.length === 0 ? (
              <EmptyState>{tCommon("noResults")}</EmptyState>
            ) : (
              <ul className="divide-y divide-espresso/5">
                {data.stockAttention.map((item) => (
                  <li
                    key={`${item.isVariant ? "v" : "p"}-${item.id}`}
                    className="flex items-center justify-between gap-3 px-5 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm text-espresso">{item.label}</p>
                      <p className="truncate text-xs text-espresso-light">{item.sku}</p>
                    </div>
                    <Pill tone="warning">
                      {formatNumber(item.stockQuantity, locale)} / {formatNumber(item.lowStockThreshold, locale)}
                    </Pill>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
