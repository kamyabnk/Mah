import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/storefront/product-card";
import { NewsletterForm } from "@/components/layout/newsletter-form";
import { listActiveCategories, listFragranceFamilies, listProducts } from "@/lib/catalog/list-products";
import { getWishlistProductIds } from "@/lib/wishlist/read";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export type HomepageSectionRow = Prisma.HomepageSectionGetPayload<Record<string, never>>;

function localized(locale: "en" | "fa", en: string | null, fa: string | null): string | null {
  return (locale === "fa" ? fa : en) ?? en ?? fa ?? null;
}

export async function HeroSection({ section, locale }: { section: HomepageSectionRow; locale: "en" | "fa" }) {
  const title = localized(locale, section.titleEn, section.titleFa);
  const subtitle = localized(locale, section.subtitleEn, section.subtitleFa);
  const ctaLabel = localized(locale, section.ctaLabelEn, section.ctaLabelFa);
  const secondaryCtaLabel = localized(locale, section.secondaryCtaLabelEn, section.secondaryCtaLabelFa);
  const badge = localized(locale, section.badgeEn, section.badgeFa);

  return (
    <section className="relative flex min-h-[70vh] items-center overflow-hidden bg-ivory-dark/40">
      {section.imageUrl && (
        <Image src={section.imageUrl} alt={title ?? ""} fill priority className="object-cover" />
      )}
      <div className="absolute inset-0 bg-espresso/20" />
      <Container className="relative z-10 flex flex-col items-start gap-4 text-ivory">
        {badge && <Badge variant="new">{badge}</Badge>}
        {title && <Heading level={1} className="text-ivory">{title}</Heading>}
        {subtitle && <Text className="max-w-lg text-ivory/90">{subtitle}</Text>}
        <div className="flex gap-4">
          {ctaLabel && section.ctaLink && (
            <Link href={section.ctaLink} className="rounded-sm bg-amber px-6 py-3 text-ivory">
              {ctaLabel}
            </Link>
          )}
          {secondaryCtaLabel && section.secondaryCtaLink && (
            <Link href={section.secondaryCtaLink} className="rounded-sm border border-ivory px-6 py-3 text-ivory">
              {secondaryCtaLabel}
            </Link>
          )}
        </div>
      </Container>
    </section>
  );
}

export async function FeaturedCategoriesSection({ section, locale }: { section: HomepageSectionRow; locale: "en" | "fa" }) {
  const title = localized(locale, section.titleEn, section.titleFa);
  const categories = await listActiveCategories(locale);
  const config = (section.config as { categoryIds?: string[] } | null) ?? {};
  const filtered = config.categoryIds?.length
    ? categories.filter((c) => config.categoryIds!.includes(c.id))
    : categories.slice(0, 6);

  return (
    <Container className="flex flex-col gap-6 py-16">
      {title && <Heading level={2}>{title}</Heading>}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {filtered.map((category) => (
          <Link key={category.id} href={`/candles/${category.slug}`} className="flex flex-col items-center gap-2">
            <div className="relative aspect-square w-full overflow-hidden rounded-md bg-ivory-dark/40">
              {category.image && <Image src={category.image} alt={category.name} fill sizes="200px" className="object-cover" />}
            </div>
            <Text className="text-center text-sm font-medium text-espresso">{category.name}</Text>
          </Link>
        ))}
      </div>
    </Container>
  );
}

async function ProductGridSection({
  section,
  locale,
  filterKey,
}: {
  section: HomepageSectionRow;
  locale: "en" | "fa";
  filterKey: "bestSeller" | "newArrival";
}) {
  const title = localized(locale, section.titleEn, section.titleFa);
  const t = await getTranslations({ locale, namespace: "common" });
  const [result, wishlisted] = await Promise.all([
    listProducts({ locale, filters: { [filterKey]: true }, sort: "featured", page: 1 }),
    getWishlistProductIds(),
  ]);
  const products = result.products.slice(0, 8);
  if (products.length === 0) return null;

  return (
    <Container className="flex flex-col gap-6 py-16">
      {title && <Heading level={2}>{title}</Heading>}
      <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} isWishlisted={wishlisted.has(product.id)} currencyLabel={t("currency")} />
        ))}
      </div>
    </Container>
  );
}

export function BestSellersSection(props: { section: HomepageSectionRow; locale: "en" | "fa" }) {
  return <ProductGridSection {...props} filterKey="bestSeller" />;
}

export function NewArrivalsSection(props: { section: HomepageSectionRow; locale: "en" | "fa" }) {
  return <ProductGridSection {...props} filterKey="newArrival" />;
}

export async function ShopByFragranceSection({ section, locale }: { section: HomepageSectionRow; locale: "en" | "fa" }) {
  const title = localized(locale, section.titleEn, section.titleFa);
  const families = await listFragranceFamilies(locale);

  return (
    <Container className="flex flex-col gap-6 py-16">
      {title && <Heading level={2}>{title}</Heading>}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {families.map((family) => (
          <Link
            key={family.id}
            href={`/candles?fragrance=${family.slug}`}
            className="rounded-md border border-espresso/10 px-4 py-6 text-center"
          >
            <Text className="font-medium text-espresso">{family.name}</Text>
          </Link>
        ))}
      </div>
    </Container>
  );
}

export function PromoBannerSection({ section, locale }: { section: HomepageSectionRow; locale: "en" | "fa" }) {
  const title = localized(locale, section.titleEn, section.titleFa);
  const description = localized(locale, section.descriptionEn, section.descriptionFa);
  const ctaLabel = localized(locale, section.ctaLabelEn, section.ctaLabelFa);

  return (
    <Container className="py-16">
      <div className="flex flex-col items-center gap-4 rounded-md bg-terracotta/10 px-8 py-12 text-center">
        {title && <Heading level={2}>{title}</Heading>}
        {description && <Text className="max-w-lg">{description}</Text>}
        {ctaLabel && section.ctaLink && (
          <Link href={section.ctaLink} className="rounded-sm bg-amber px-6 py-3 text-ivory">
            {ctaLabel}
          </Link>
        )}
      </div>
    </Container>
  );
}

export function AboutSection({ section, locale }: { section: HomepageSectionRow; locale: "en" | "fa" }) {
  const title = localized(locale, section.titleEn, section.titleFa);
  const description = localized(locale, section.descriptionEn, section.descriptionFa);

  return (
    <Container className="flex flex-col items-center gap-4 py-16 text-center">
      {title && <Heading level={2}>{title}</Heading>}
      {description && <Text className="max-w-2xl">{description}</Text>}
    </Container>
  );
}

export async function NewsletterSection({ section, locale }: { section: HomepageSectionRow; locale: "en" | "fa" }) {
  const title = localized(locale, section.titleEn, section.titleFa);
  const t = await getTranslations({ locale, namespace: "newsletter" });

  return (
    <Container className="flex flex-col items-center gap-4 py-16 text-center">
      {title && <Heading level={2}>{title}</Heading>}
      <NewsletterForm placeholder={t("placeholder")} cta={t("cta")} />
    </Container>
  );
}

export async function getEnabledHomepageSections() {
  return prisma.homepageSection.findMany({ where: { isEnabled: true }, orderBy: { sortOrder: "asc" } });
}
