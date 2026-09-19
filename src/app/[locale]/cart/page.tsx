import { getTranslations } from "next-intl/server";
import { getCart } from "@/lib/cart/read";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Link } from "@/i18n/navigation";
import { CartItemRow } from "@/components/storefront/cart-item-row";

export default async function CartPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const activeLocale = locale === "fa" ? "fa" : "en";
  const t = await getTranslations({ locale: activeLocale, namespace: "cart" });
  const cart = await getCart(activeLocale);

  return (
    <Container className="flex flex-col gap-8 py-16">
      <Heading level={1}>{t("title")}</Heading>
      {cart.items.length === 0 ? (
        <div className="flex flex-col gap-4">
          <Text>{t("empty")}</Text>
          <Link href="/candles" className="text-amber underline">
            {t("continueShopping")}
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {cart.items.map((item) => (
            <CartItemRow key={item.id} item={item} currencyLabel={t("currency")} />
          ))}
          <div className="flex justify-between pt-4">
            <Text className="font-medium text-espresso">{t("subtotal")}</Text>
            <Text className="font-medium text-espresso">
              {cart.subtotal.toLocaleString()} {t("currency")}
            </Text>
          </div>
          <Link
            href="/checkout"
            className="inline-flex h-11 items-center justify-center rounded-sm bg-amber px-6 text-base font-medium text-ivory transition-colors hover:bg-amber/90"
          >
            {t("checkout")}
          </Link>
        </div>
      )}
    </Container>
  );
}
