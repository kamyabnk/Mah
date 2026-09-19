import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getProductBySlug, getRelatedProducts } from "@/lib/catalog/product-detail";
import { getWishlistProductIds } from "@/lib/wishlist/read";
import { getEffectivePrice } from "@/lib/catalog/pricing";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
import { ProductGallery } from "@/components/storefront/product-gallery";
import { VariantSelector } from "@/components/storefront/variant-selector";
import { AddToCartButton } from "@/components/storefront/add-to-cart-button";
import { WishlistToggleButton } from "@/components/storefront/wishlist-toggle-button";
import { RatingStars } from "@/components/storefront/rating-stars";
import { ProductCard } from "@/components/storefront/product-card";

interface ProductPageParams {
  locale: string;
  slug: string;
}

export async function generateMetadata({ params }: { params: Promise<ProductPageParams> }) {
  const { locale, slug } = await params;
  const activeLocale = locale === "fa" ? "fa" : "en";
  const product = await getProductBySlug(activeLocale, slug);
  if (!product) return {};
  return {
    title: (activeLocale === "fa" ? product.seoTitleFa : product.seoTitleEn) ?? (activeLocale === "fa" ? product.nameFa : product.nameEn),
    description: activeLocale === "fa" ? product.seoDescriptionFa : product.seoDescriptionEn,
  };
}

export default async function ProductPage({ params }: { params: Promise<ProductPageParams> }) {
  const { locale, slug } = await params;
  const activeLocale = locale === "fa" ? "fa" : "en";
  const t = await getTranslations({ locale: activeLocale, namespace: "product" });
  const tCommon = await getTranslations({ locale: activeLocale, namespace: "common" });

  const product = await getProductBySlug(activeLocale, slug);
  if (!product) notFound();

  const name = activeLocale === "fa" ? product.nameFa : product.nameEn;
  const description = activeLocale === "fa" ? product.descriptionFa : product.descriptionEn;
  const categoryIds = product.categories.map((c) => c.categoryId);

  const [related, wishlisted] = await Promise.all([
    getRelatedProducts(activeLocale, product.id, categoryIds, product.fragranceFamilyId),
    getWishlistProductIds(),
  ]);

  const images = product.images.map((img) => img.url);
  const price = getEffectivePrice(product);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    image: images,
    sku: product.sku,
    offers: {
      "@type": "Offer",
      price,
      priceCurrency: "IRT",
      availability: product.stockQuantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
    },
    ...(product.averageRating !== null
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Number(product.averageRating),
            reviewCount: product.reviewCount,
          },
        }
      : {}),
  };

  return (
    <Container className="flex flex-col gap-16 py-12">
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <ProductGallery images={images} alt={name} />

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {product.isNewArrival && <Badge variant="new">New</Badge>}
            {product.isBestSeller && <Badge variant="bestseller">Best Seller</Badge>}
            {product.salePrice !== null && <Badge variant="sale">{tCommon("save")}</Badge>}
          </div>
          <Heading level={1}>{name}</Heading>
          <RatingStars rating={product.averageRating !== null ? Number(product.averageRating) : null} reviewCount={product.reviewCount} />
          <Text className="text-sm text-espresso-light">
            {t("sku")}: {product.sku}
          </Text>
          {activeLocale === "fa" ? (
            <Text>{product.shortDescriptionFa}</Text>
          ) : (
            <Text>{product.shortDescriptionEn}</Text>
          )}

          {product.hasVariants && product.variants.length > 0 ? (
            <VariantSelector
              productId={product.id}
              variants={product.variants.map((v) => ({
                id: v.id,
                name: activeLocale === "fa" ? v.nameFa : v.nameEn,
                size: v.size,
                color: v.color,
                price: v.price !== null ? Number(v.price) : null,
                salePrice: v.salePrice !== null ? Number(v.salePrice) : null,
                stockQuantity: v.stockQuantity,
              }))}
              fallbackPrice={Number(product.price)}
              fallbackSalePrice={product.salePrice !== null ? Number(product.salePrice) : null}
              fallbackStock={product.stockQuantity}
              currencyLabel={tCommon("currency")}
            />
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Text className="text-xl font-medium text-espresso">
                  {price.toLocaleString()} {tCommon("currency")}
                </Text>
                {product.salePrice !== null && (
                  <Text className="text-espresso-light line-through">
                    {Number(product.price).toLocaleString()} {tCommon("currency")}
                  </Text>
                )}
              </div>
              <div className="flex items-center gap-3">
                <AddToCartButton productId={product.id} disabled={product.stockQuantity <= 0} />
                <WishlistToggleButton
                  productId={product.id}
                  initialWishlisted={wishlisted.has(product.id)}
                  loginHref="/account/login"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 border-t border-espresso/10 pt-4 text-sm">
            {product.waxType && (
              <Text>
                {t("waxType")}: {product.waxType}
              </Text>
            )}
            {product.wickType && (
              <Text>
                {t("wickType")}: {product.wickType}
              </Text>
            )}
            {product.burnTimeMinutes && (
              <Text>
                {t("burnTime")}: {Math.round(product.burnTimeMinutes / 60)}h
              </Text>
            )}
            {product.weight && (
              <Text>
                {t("weight")}: {Number(product.weight)}g
              </Text>
            )}
            {product.color && (
              <Text>
                {t("color")}: {product.color}
              </Text>
            )}
            {product.size && (
              <Text>
                {t("size")}: {product.size}
              </Text>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {description && (
          <section>
            <Heading level={3}>{t("description")}</Heading>
            <Text className="mt-2">{activeLocale === "fa" ? product.descriptionFa : product.descriptionEn}</Text>
          </section>
        )}
        {(activeLocale === "fa" ? product.fragranceNotesFa : product.fragranceNotesEn) && (
          <section>
            <Heading level={3}>{t("fragranceNotes")}</Heading>
            <Text className="mt-2">
              {activeLocale === "fa" ? product.fragranceNotesFa : product.fragranceNotesEn}
            </Text>
          </section>
        )}
        {(activeLocale === "fa" ? product.careInstructionsFa : product.careInstructionsEn) && (
          <section>
            <Heading level={3}>{t("careInstructions")}</Heading>
            <Text className="mt-2">
              {activeLocale === "fa" ? product.careInstructionsFa : product.careInstructionsEn}
            </Text>
          </section>
        )}
        {(activeLocale === "fa" ? product.safetyInstructionsFa : product.safetyInstructionsEn) && (
          <section>
            <Heading level={3}>{t("safetyInstructions")}</Heading>
            <Text className="mt-2">
              {activeLocale === "fa" ? product.safetyInstructionsFa : product.safetyInstructionsEn}
            </Text>
          </section>
        )}
      </div>

      <section>
        <Heading level={3}>{t("reviews")}</Heading>
        {product.reviews.length === 0 ? (
          <Text className="mt-2">{t("noReviews")}</Text>
        ) : (
          <div className="mt-4 flex flex-col gap-4">
            {product.reviews.map((review) => (
              <div key={review.id} className="border-b border-espresso/10 pb-4">
                <RatingStars rating={review.rating} />
                <Text className="mt-1 font-medium text-espresso">
                  {review.customer.firstName} {review.customer.lastName.charAt(0)}.
                </Text>
                <Text className="mt-1">{review.body}</Text>
              </div>
            ))}
          </div>
        )}
      </section>

      {related.length > 0 && (
        <section>
          <Heading level={3}>{t("relatedProducts")}</Heading>
          <div className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} currencyLabel={tCommon("currency")} />
            ))}
          </div>
        </section>
      )}
    </Container>
  );
}
