import { notFound } from "next/navigation";
import { resolveCategoryBySlug } from "@/lib/catalog/list-products";
import { ProductListing, type ListingSearchParams } from "@/components/storefront/product-listing";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; categorySlug: string }>;
}) {
  const { locale, categorySlug } = await params;
  const activeLocale = locale === "fa" ? "fa" : "en";
  const category = await resolveCategoryBySlug(activeLocale, categorySlug);
  if (!category) return {};
  return {
    title: (activeLocale === "fa" ? category.seoTitleFa : category.seoTitleEn) ?? (activeLocale === "fa" ? category.nameFa : category.nameEn),
    description: activeLocale === "fa" ? category.seoDescriptionFa : category.seoDescriptionEn,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; categorySlug: string }>;
  searchParams: Promise<ListingSearchParams>;
}) {
  const { locale, categorySlug } = await params;
  const activeLocale = locale === "fa" ? "fa" : "en";
  const resolvedSearchParams = await searchParams;

  const category = await resolveCategoryBySlug(activeLocale, categorySlug);
  if (!category) notFound();

  return (
    <ProductListing
      locale={activeLocale}
      title={activeLocale === "fa" ? category.nameFa : category.nameEn}
      categoryId={category.id}
      basePath={`/candles/${categorySlug}`}
      searchParams={resolvedSearchParams}
    />
  );
}
