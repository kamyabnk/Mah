import { getTranslations } from "next-intl/server";
import { getCurrentCustomerOrders } from "@/lib/orders/read";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Link } from "@/i18n/navigation";

export default async function OrdersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const activeLocale = locale === "fa" ? "fa" : "en";
  const t = await getTranslations({ locale: activeLocale, namespace: "orders" });
  const tStatus = await getTranslations({ locale: activeLocale, namespace: "orderStatus" });
  const tCommon = await getTranslations({ locale: activeLocale, namespace: "common" });
  const orders = await getCurrentCustomerOrders();

  return (
    <Container className="flex flex-col gap-6 py-16">
      <Heading level={1}>{t("title")}</Heading>
      {orders.length === 0 ? (
        <Text>{t("empty")}</Text>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${order.orderNumber}`}
              className="flex items-center justify-between rounded-md border border-espresso/10 p-4"
            >
              <div>
                <Text className="font-medium text-espresso">
                  {t("orderNumber")} {order.orderNumber}
                </Text>
                <Text className="text-sm">{new Date(order.createdAt).toLocaleDateString()}</Text>
              </div>
              <Text className="text-sm">{tStatus(order.status)}</Text>
              <Text className="font-medium text-espresso">
                {Number(order.grandTotal).toLocaleString()} {tCommon("currency")}
              </Text>
            </Link>
          ))}
        </div>
      )}
    </Container>
  );
}
