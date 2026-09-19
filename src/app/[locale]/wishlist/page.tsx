import { getTranslations } from "next-intl/server";
import { getWishlist } from "@/lib/wishlist/read";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Link } from "@/i18n/navigation";
import { WishlistItemCard } from "@/components/storefront/wishlist-item-card";

export default async function WishlistPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const activeLocale = locale === "fa" ? "fa" : "en";
  const t = await getTranslations({ locale: activeLocale, namespace: "wishlist" });
  const tCommon = await getTranslations({ locale: activeLocale, namespace: "common" });
  const items = await getWishlist(activeLocale);

  return (
    <Container className="flex flex-col gap-8 py-16">
      <Heading level={1}>{t("title")}</Heading>
      {items.length === 0 ? (
        <div className="flex flex-col gap-4">
          <Text>{t("empty")}</Text>
          <Link href="/candles" className="text-amber underline">
            {t("moveToCart")}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((item) => (
            <WishlistItemCard key={item.productId} item={item} currencyLabel={tCommon("currency")} />
          ))}
        </div>
      )}
    </Container>
  );
}
