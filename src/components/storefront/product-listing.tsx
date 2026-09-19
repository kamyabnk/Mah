import { getTranslations } from "next-intl/server";
import { listProducts, listFragranceFamilies, type ProductListFilters, type SortOption } from "@/lib/catalog/list-products";
import { getWishlistProductIds } from "@/lib/wishlist/read";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { ProductCard } from "./product-card";
import { FilterSidebar } from "./filter-sidebar";
import { SortDropdown } from "./sort-dropdown";
import { Pagination } from "./pagination";

export interface ListingSearchParams {
  minPrice?: string;
  maxPrice?: string;
  fragrance?: string;
  inStock?: string;
  bestSeller?: string;
  newArrival?: string;
  onSale?: string;
  minRating?: string;
  sort?: string;
  page?: string;
}

interface ProductListingProps {
  locale: "en" | "fa";
  title: string;
  categoryId?: string;
  basePath: string;
  searchParams: ListingSearchParams;
}

export async function ProductListing({ locale, title, categoryId, basePath, searchParams }: ProductListingProps) {
  const t = await getTranslations({ locale, namespace: "filters" });
  const tCommon = await getTranslations({ locale, namespace: "common" });

  const filters: ProductListFilters = {
    categoryId,
    minPrice: searchParams.minPrice ? Number(searchParams.minPrice) : undefined,
    maxPrice: searchParams.maxPrice ? Number(searchParams.maxPrice) : undefined,
    inStock: searchParams.inStock === "1",
    bestSeller: searchParams.bestSeller === "1",
    newArrival: searchParams.newArrival === "1",
    onSale: searchParams.onSale === "1",
    minRating: searchParams.minRating ? Number(searchParams.minRating) : undefined,
  };

  if (searchParams.fragrance) {
    const { resolveFragranceFamilyBySlug } = await import("@/lib/catalog/list-products");
    const family = await resolveFragranceFamilyBySlug(locale, searchParams.fragrance);
    if (family) filters.fragranceFamilyId = family.id;
  }

  const sort = (searchParams.sort as SortOption | undefined) ?? "featured";
  const page = searchParams.page ? Number(searchParams.page) : 1;

  const [result, fragrances, wishlisted] = await Promise.all([
    listProducts({ locale, filters, sort, page }),
    listFragranceFamilies(locale),
    getWishlistProductIds(),
  ]);

  return (
    <Container className="flex flex-col gap-8 py-12">
      <div className="flex items-center justify-between">
        <Heading level={1}>{title}</Heading>
        <SortDropdown />
      </div>
      <div className="flex flex-col gap-8 sm:flex-row">
        <FilterSidebar fragrances={fragrances} />
        <div className="flex-1">
          {result.products.length === 0 ? (
            <Text>{t("noResults")}</Text>
          ) : (
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
          )}
          <Pagination
            page={result.page}
            pageCount={result.pageCount}
            buildHref={(p) => {
              const params = new URLSearchParams();
              for (const [key, value] of Object.entries(searchParams)) {
                if (value && key !== "page") params.set(key, value);
              }
              params.set("page", String(p));
              return `${basePath}?${params.toString()}`;
            }}
          />
        </div>
      </div>
    </Container>
  );
}
