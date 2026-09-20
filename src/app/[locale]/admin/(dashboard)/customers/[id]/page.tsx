import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  AdminPageHeader,
  Panel,
  PanelHeader,
  Pill,
  StatCard,
  Table,
  TableWrap,
  Td,
  Th,
} from "@/components/admin/ui";
import { CustomerStatusToggle } from "@/components/admin/customers/customer-status-toggle";
import { getAdminCustomer } from "@/lib/admin/customers/queries";
import { requireAdminPagePermission } from "@/lib/admin/session";
import { hasPermission } from "@/lib/auth/permissions";
import {
  formatDate,
  formatMoney,
  formatNumber,
  localised,
  type AdminLocale,
} from "@/lib/admin/format";

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: rawLocale, id } = await params;
  const locale: AdminLocale = rawLocale === "fa" ? "fa" : "en";
  const session = await requireAdminPagePermission(rawLocale, "customers.view");

  const customer = await getAdminCustomer(id);
  if (!customer) notFound();

  const t = await getTranslations({ locale: rawLocale, namespace: "admin.customers" });
  const tCommon = await getTranslations({ locale: rawLocale, namespace: "admin.common" });
  const tStatus = await getTranslations({ locale: rawLocale, namespace: "orderStatus" });

  const canManage = hasPermission(session.permissions, "customers.manage");
  const canSeeOrders = hasPermission(session.permissions, "orders.manage");

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={`${customer.firstName} ${customer.lastName}`}
        description={customer.email}
        actions={
          <>
            <Pill tone={customer.isActive ? "positive" : "danger"}>
              {customer.isActive ? t("active") : t("disabled")}
            </Pill>
            {canManage && (
              <CustomerStatusToggle customerId={customer.id} isActive={customer.isActive} />
            )}
            <Link href="/admin/customers" className="text-sm text-espresso-light underline">
              {tCommon("back")}
            </Link>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label={t("totalSpend")}
          value={`${formatMoney(customer.totalSpend, locale)} ${tCommon("currency")}`}
        />
        <StatCard label={t("orderCount")} value={formatNumber(customer.orders.length, locale)} />
        <StatCard label={t("joined")} value={formatDate(customer.createdAt, locale)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Panel>
            <PanelHeader title={t("orderHistory")} />
            {customer.orders.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-espresso-light">{t("noOrders")}</p>
            ) : (
              <TableWrap>
                <Table>
                  <thead>
                    <tr>
                      <Th>{tCommon("id")}</Th>
                      <Th>{tCommon("date")}</Th>
                      <Th>{tCommon("quantity")}</Th>
                      <Th>{tCommon("total")}</Th>
                      <Th>{tCommon("status")}</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.orders.map((order) => (
                      <tr key={order.id}>
                        <Td>
                          {canSeeOrders ? (
                            <Link
                              href={`/admin/orders/${order.id}`}
                              className="font-mono text-xs text-amber underline"
                            >
                              {order.orderNumber}
                            </Link>
                          ) : (
                            <span className="font-mono text-xs">{order.orderNumber}</span>
                          )}
                        </Td>
                        <Td className="whitespace-nowrap text-xs text-espresso-light">
                          {formatDate(order.createdAt, locale)}
                        </Td>
                        <Td className="tabular-nums">{formatNumber(order._count.items, locale)}</Td>
                        <Td className="whitespace-nowrap tabular-nums">
                          {formatMoney(order.grandTotal, locale)}
                        </Td>
                        <Td>
                          <Pill>{tStatus(order.status)}</Pill>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </TableWrap>
            )}
          </Panel>
        </div>

        <div className="flex flex-col gap-4">
          <Panel>
            <PanelHeader title={t("addresses")} />
            {customer.addresses.length === 0 ? (
              <p className="px-5 py-6 text-sm text-espresso-light">{t("noAddresses")}</p>
            ) : (
              <ul className="divide-y divide-espresso/5">
                {customer.addresses.map((address) => (
                  <li key={address.id} className="flex flex-col gap-0.5 p-5 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-espresso">{address.label}</span>
                      {address.isDefault && <Pill tone="positive">{t("defaultAddress")}</Pill>}
                    </div>
                    <span className="text-espresso-light">
                      {address.firstName} {address.lastName} · {address.phone}
                    </span>
                    <span className="text-espresso-light">{address.addressLine}</span>
                    <span className="text-espresso-light">
                      {address.city}, {address.province} {address.postalCode}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel>
            <PanelHeader title={t("wishlist")} />
            {customer.wishlistItems.length === 0 ? (
              <p className="px-5 py-6 text-sm text-espresso-light">{t("noWishlist")}</p>
            ) : (
              <ul className="divide-y divide-espresso/5">
                {customer.wishlistItems.map((item) => (
                  <li key={item.productId} className="flex flex-col gap-0.5 p-5 text-sm">
                    <Link
                      href={`/admin/products/${item.product.id}`}
                      className="text-amber underline"
                    >
                      {localised(locale, item.product.nameEn, item.product.nameFa)}
                    </Link>
                    <span className="text-xs text-espresso-light">{item.product.sku}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {customer.phone && (
            <Panel className="p-5">
              <p className="text-xs uppercase tracking-wide text-espresso-light">{t("phone")}</p>
              <p className="mt-1 text-sm text-espresso">{customer.phone}</p>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
