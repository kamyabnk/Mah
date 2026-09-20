import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  AdminPageHeader,
  Panel,
  PanelHeader,
  Pill,
  Table,
  TableWrap,
  Td,
  Th,
} from "@/components/admin/ui";
import { OrderInternalNote, OrderStatusPanel } from "@/components/admin/orders/order-actions";
import { getAdminOrder } from "@/lib/admin/orders/queries";
import { requireAdminPagePermission } from "@/lib/admin/session";
import { hasPermission } from "@/lib/auth/permissions";
import {
  formatDateTime,
  formatMoney,
  formatNumber,
  localised,
  type AdminLocale,
} from "@/lib/admin/format";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: rawLocale, id } = await params;
  const locale: AdminLocale = rawLocale === "fa" ? "fa" : "en";
  const session = await requireAdminPagePermission(rawLocale, "orders.manage");

  const order = await getAdminOrder(id);
  if (!order) notFound();

  const t = await getTranslations({ locale: rawLocale, namespace: "admin.orders" });
  const tCommon = await getTranslations({ locale: rawLocale, namespace: "admin.common" });
  const tStatus = await getTranslations({ locale: rawLocale, namespace: "orderStatus" });
  const tPayment = await getTranslations({ locale: rawLocale, namespace: "admin.paymentStatus" });

  const canSeeCustomer = hasPermission(session.permissions, "customers.view");
  const hasPendingManualPayment = order.payments.some(
    (payment) => payment.status === "PENDING" && payment.provider === "manual"
  );

  const money = (value: number) => `${formatMoney(value, locale)} ${tCommon("currency")}`;
  const address = order.shipping;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={t("detailTitle", { orderNumber: order.orderNumber })}
        description={`${t("placedOn")}: ${formatDateTime(order.createdAt, locale)}`}
        actions={
          <>
            <Pill>{tStatus(order.status)}</Pill>
            <Link href="/admin/orders" className="text-sm text-espresso-light underline">
              {tCommon("back")}
            </Link>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="flex flex-col gap-4 xl:col-span-2">
          <Panel>
            <PanelHeader title={t("items")} />
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>{tCommon("name")}</Th>
                    <Th>{tCommon("sku")}</Th>
                    <Th>{tCommon("price")}</Th>
                    <Th>{tCommon("quantity")}</Th>
                    <Th>{tCommon("total")}</Th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <Td>
                        {item.product ? (
                          <Link
                            href={`/admin/products/${item.product.id}`}
                            className="text-amber underline"
                          >
                            {localised(locale, item.productNameEn, item.productNameFa)}
                          </Link>
                        ) : (
                          localised(locale, item.productNameEn, item.productNameFa)
                        )}
                        {item.variantLabelEn && (
                          <span className="block text-xs text-espresso-light">
                            {localised(
                              locale,
                              item.variantLabelEn,
                              item.variantLabelFa ?? item.variantLabelEn
                            )}
                          </span>
                        )}
                      </Td>
                      <Td className="whitespace-nowrap text-xs text-espresso-light">{item.sku}</Td>
                      <Td className="whitespace-nowrap tabular-nums">
                        {formatMoney(item.unitPrice, locale)}
                      </Td>
                      <Td className="tabular-nums">{formatNumber(item.quantity, locale)}</Td>
                      <Td className="whitespace-nowrap tabular-nums">
                        {formatMoney(item.lineTotal, locale)}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableWrap>

            <dl className="flex flex-col gap-1.5 border-t border-espresso/10 p-5 text-sm">
              <Row label={t("subtotal")} value={money(order.subtotal)} />
              {order.discountTotal > 0 && (
                <Row
                  label={
                    order.coupon ? `${t("discount")} (${order.coupon.code})` : t("discount")
                  }
                  value={`− ${money(order.discountTotal)}`}
                />
              )}
              <Row label={t("shipping")} value={money(order.shippingTotal)} />
              {order.taxTotal > 0 && <Row label={t("tax")} value={money(order.taxTotal)} />}
              <div className="mt-1 flex items-baseline justify-between gap-3 border-t border-espresso/10 pt-2 font-medium">
                <dt className="text-espresso">{t("grandTotal")}</dt>
                <dd className="tabular-nums text-espresso">{money(order.grandTotal)}</dd>
              </div>
            </dl>
          </Panel>

          <Panel>
            <PanelHeader title={t("statusHistory")} />
            <ol className="flex flex-col gap-0 p-5">
              {order.statusHistory.map((entry) => (
                <li
                  key={entry.id}
                  className="flex gap-3 border-s border-espresso/15 ps-4 pb-4 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Pill>{tStatus(entry.status)}</Pill>
                      <span className="text-xs text-espresso-light">
                        {formatDateTime(entry.createdAt, locale)}
                      </span>
                    </div>
                    {entry.note && <p className="mt-1 text-sm text-espresso">{entry.note}</p>}
                    <p className="mt-0.5 text-xs text-espresso-light">
                      {entry.changedByAdmin?.name ?? "—"}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="flex flex-col gap-4">
          <Panel>
            <PanelHeader title={t("customerInfo")} />
            <div className="flex flex-col gap-1 p-5 text-sm">
              {order.customer ? (
                <>
                  <p className="text-espresso">
                    {order.customer.firstName} {order.customer.lastName}
                  </p>
                  <p className="text-espresso-light">{order.customer.email}</p>
                  {order.customer.phone && (
                    <p className="text-espresso-light">{order.customer.phone}</p>
                  )}
                  {canSeeCustomer && (
                    <Link
                      href={`/admin/customers/${order.customer.id}`}
                      className="mt-1 text-sm text-amber underline"
                    >
                      {t("viewCustomer")}
                    </Link>
                  )}
                </>
              ) : (
                <>
                  <Pill tone="muted">{t("guest")}</Pill>
                  <p className="mt-1 text-espresso-light">{order.guestEmail ?? "—"}</p>
                  <p className="text-espresso-light">{order.guestPhone ?? "—"}</p>
                </>
              )}
            </div>
          </Panel>

          <Panel>
            <PanelHeader title={t("shippingAddress")} />
            <address className="flex flex-col gap-0.5 p-5 text-sm not-italic text-espresso-light">
              <span className="text-espresso">
                {address.firstName} {address.lastName}
              </span>
              <span>{address.phone}</span>
              <span>{address.addressLine}</span>
              <span>
                {address.city}
                {address.province ? `, ${address.province}` : ""}
              </span>
              <span>{address.postalCode}</span>
              <span>{address.country}</span>
            </address>
          </Panel>

          <Panel>
            <PanelHeader title={t("payment")} />
            {order.payments.length === 0 ? (
              <p className="px-5 py-6 text-sm text-espresso-light">{t("noPayment")}</p>
            ) : (
              <ul className="divide-y divide-espresso/5">
                {order.payments.map((payment) => (
                  <li key={payment.id} className="flex flex-col gap-1 p-5 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-espresso-light">{t("paymentProvider")}</span>
                      <span className="text-espresso">{payment.provider}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-espresso-light">{t("paymentStatus")}</span>
                      <Pill tone={payment.status === "SUCCEEDED" ? "positive" : "warning"}>
                        {tPayment(payment.status)}
                      </Pill>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-espresso-light">{t("paymentAmount")}</span>
                      <span className="tabular-nums text-espresso">{money(payment.amount)}</span>
                    </div>
                    {payment.providerRef && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-espresso-light">{t("paymentRef")}</span>
                        <span className="truncate font-mono text-xs text-espresso">
                          {payment.providerRef}
                        </span>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <OrderStatusPanel
            orderId={order.id}
            currentStatus={order.status}
            hasPendingManualPayment={hasPendingManualPayment}
          />

          {order.customerNote && (
            <Panel>
              <PanelHeader title={t("customerNote")} />
              <p className="p-5 text-sm text-espresso">{order.customerNote}</p>
            </Panel>
          )}

          <OrderInternalNote orderId={order.id} initialNote={order.internalNote ?? ""} />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-espresso-light">{label}</dt>
      <dd className="tabular-nums text-espresso">{value}</dd>
    </div>
  );
}
