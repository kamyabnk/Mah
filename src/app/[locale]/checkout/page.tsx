import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCart } from "@/lib/cart/read";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { CheckoutForm } from "@/components/checkout/checkout-form";

export default async function CheckoutPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const activeLocale = locale === "fa" ? "fa" : "en";
  const t = await getTranslations({ locale: activeLocale, namespace: "checkout" });
  const tCommon = await getTranslations({ locale: activeLocale, namespace: "common" });
  const cart = await getCart(activeLocale);

  if (cart.items.length === 0) {
    redirect("/cart");
  }

  return (
    <Container className="flex flex-col gap-10 py-12 lg:flex-row">
      <div className="flex-1">
        <Heading level={1}>{t("title")}</Heading>
        <CheckoutForm />
      </div>
      <aside className="flex w-full flex-col gap-4 rounded-md border border-espresso/10 p-6 lg:w-80">
        <Heading level={3}>{t("orderSummary")}</Heading>
        {cart.items.map((item) => (
          <div key={item.id} className="flex justify-between text-sm">
            <Text>
              {item.name} × {item.quantity}
            </Text>
            <Text>
              {(item.unitPrice * item.quantity).toLocaleString()} {tCommon("currency")}
            </Text>
          </div>
        ))}
        <div className="flex justify-between border-t border-espresso/10 pt-2 font-medium text-espresso">
          <Text>{t("subtotal")}</Text>
          <Text>
            {cart.subtotal.toLocaleString()} {tCommon("currency")}
          </Text>
        </div>
      </aside>
    </Container>
  );
}
