import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { customerAuth } from "@/lib/auth/customer-auth";
import { getOrderByNumber } from "@/lib/orders/read";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Link } from "@/i18n/navigation";

export default async function OrderConfirmationPage({
  params,
}: {
  params: Promise<{ locale: string; orderNumber: string }>;
}) {
  const { locale, orderNumber } = await params;
  const activeLocale = locale === "fa" ? "fa" : "en";
  const t = await getTranslations({ locale: activeLocale, namespace: "orders" });
  const tCommon = await getTranslations({ locale: activeLocale, namespace: "common" });

  const session = await customerAuth();
  const customerId = (session?.user as { id?: string } | undefined)?.id ?? null;
  const order = await getOrderByNumber(orderNumber, null);
  if (!order) notFound();
  // Guests can view their own confirmation right after checkout (no session to scope by);
  // logged-in customers can only reach this for their own orders.
  if (customerId && order.customerId && order.customerId !== customerId) notFound();

  return (
    <Container className="flex flex-col gap-6 py-16">
      <Heading level={1}>{t("confirmationTitle")}</Heading>
      <Text>{t("confirmationBody")}</Text>
      <Text className="font-medium text-espresso">
        {t("orderNumber")}: {order.orderNumber}
      </Text>
      <div className="flex flex-col gap-2">
        {order.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <Text>
              {item.productNameEn} × {item.quantity}
            </Text>
            <Text>
              {Number(item.lineTotal).toLocaleString()} {tCommon("currency")}
            </Text>
          </div>
        ))}
      </div>
      <div className="flex justify-between border-t border-espresso/10 pt-2 font-medium text-espresso">
        <Text>{t("total")}</Text>
        <Text>
          {Number(order.grandTotal).toLocaleString()} {tCommon("currency")}
        </Text>
      </div>
      {customerId && (
        <Link href="/account/orders" className="text-amber underline">
          {t("viewOrders")}
        </Link>
      )}
    </Container>
  );
}
