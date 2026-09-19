import { getTranslations } from "next-intl/server";
import { ProductListing, type ListingSearchParams } from "@/components/storefront/product-listing";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "nav" });
  return { title: t("shopAll") };
}

export default async function CandlesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<ListingSearchParams>;
}) {
  const { locale } = await params;
  const activeLocale = locale === "fa" ? "fa" : "en";
  const resolvedSearchParams = await searchParams;
  const t = await getTranslations({ locale: activeLocale, namespace: "nav" });

  return (
    <ProductListing
      locale={activeLocale}
      title={t("shopAll")}
      basePath="/candles"
      searchParams={resolvedSearchParams}
    />
  );
}
