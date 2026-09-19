import { getTranslations } from "next-intl/server";
import { searchProducts } from "@/lib/catalog/search-products";
import { getWishlistProductIds } from "@/lib/wishlist/read";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { ProductCard } from "@/components/storefront/product-card";
import { SearchBox } from "@/components/storefront/search-box";

export default async function SearchPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { locale } = await params;
  const activeLocale = locale === "fa" ? "fa" : "en";
  const { q = "" } = await searchParams;
  const t = await getTranslations({ locale: activeLocale, namespace: "search" });
  const tCommon = await getTranslations({ locale: activeLocale, namespace: "common" });

  const [result, wishlisted] = await Promise.all([
    searchProducts(activeLocale, q),
    getWishlistProductIds(),
  ]);

  return (
    <Container className="flex flex-col gap-8 py-12">
      <Heading level={1}>{t("title")}</Heading>
      <div className="max-w-md">
        <SearchBox locale={activeLocale} initialQuery={q} />
      </div>
      {q && (
        <Text>{result.products.length > 0 ? t("resultsFor", { query: q }) : t("noResults", { query: q })}</Text>
      )}
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
        {result.products.map((product) => (
          <ProductCard
            key={product.id}
            product={product}
            isWishlisted={wishlisted.has(product.id)}
            currencyLabel={tCommon("currency")}
          />
        ))}
      </div>
    </Container>
  );
}
