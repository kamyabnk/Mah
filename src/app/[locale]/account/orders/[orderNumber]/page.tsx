import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { customerAuth } from "@/lib/auth/customer-auth";
import { getOrderByNumber } from "@/lib/orders/read";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ locale: string; orderNumber: string }>;
}) {
  const { locale, orderNumber } = await params;
  const activeLocale = locale === "fa" ? "fa" : "en";
  const t = await getTranslations({ locale: activeLocale, namespace: "orders" });
  const tStatus = await getTranslations({ locale: activeLocale, namespace: "orderStatus" });
  const tCommon = await getTranslations({ locale: activeLocale, namespace: "common" });

  const session = await customerAuth();
  const customerId = (session?.user as { id?: string } | undefined)?.id ?? null;
  if (!customerId) notFound();

  const order = await getOrderByNumber(orderNumber, customerId);
  if (!order) notFound();

  const address = order.shippingAddress as {
    firstName: string;
    lastName: string;
    addressLine: string;
    city: string;
    province: string;
    postalCode: string;
    country: string;
  };

  return (
    <Container className="flex flex-col gap-6 py-16">
      <Heading level={1}>
        {t("orderNumber")} {order.orderNumber}
      </Heading>
      <Text>
        {t("status")}: {tStatus(order.status)}
      </Text>
      <Text>{t("placedOn")}: {new Date(order.createdAt).toLocaleDateString()}</Text>

      <section>
        <Heading level={3}>{t("items")}</Heading>
        <div className="mt-2 flex flex-col gap-2">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-sm">
              <Text>
                {activeLocale === "fa" ? item.productNameFa : item.productNameEn} × {item.quantity}
              </Text>
              <Text>
                {Number(item.lineTotal).toLocaleString()} {tCommon("currency")}
              </Text>
            </div>
          ))}
        </div>
      </section>

      <section>
        <Heading level={3}>{t("shippingAddress")}</Heading>
        <Text className="mt-2">
          {address.firstName} {address.lastName}, {address.addressLine}, {address.city}, {address.province}{" "}
          {address.postalCode}, {address.country}
        </Text>
      </section>

      <div className="flex justify-between border-t border-espresso/10 pt-4 font-medium text-espresso">
        <Text>{t("total")}</Text>
        <Text>
          {Number(order.grandTotal).toLocaleString()} {tCommon("currency")}
        </Text>
      </div>
    </Container>
  );
}
