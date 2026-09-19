import {
  AboutSection,
  BestSellersSection,
  FeaturedCategoriesSection,
  HeroSection,
  NewArrivalsSection,
  NewsletterSection,
  PromoBannerSection,
  ShopByFragranceSection,
  getEnabledHomepageSections,
} from "@/components/homepage/sections";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { getTranslations } from "next-intl/server";

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const activeLocale = locale === "fa" ? "fa" : "en";
  const sections = await getEnabledHomepageSections();

  if (sections.length === 0) {
    const t = await getTranslations({ locale: activeLocale, namespace: "common" });
    return (
      <Container className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center">
        <Heading level={1}>{t("brandName")}</Heading>
        <Text className="max-w-md">{t("tagline")}</Text>
        <Text className="max-w-md">{t("comingSoon")}</Text>
      </Container>
    );
  }

  return (
    <>
      {sections.map((section) => {
        switch (section.type) {
          case "HERO":
            return <HeroSection key={section.id} section={section} locale={activeLocale} />;
          case "FEATURED_CATEGORIES":
            return <FeaturedCategoriesSection key={section.id} section={section} locale={activeLocale} />;
          case "BEST_SELLERS":
            return <BestSellersSection key={section.id} section={section} locale={activeLocale} />;
          case "NEW_ARRIVALS":
            return <NewArrivalsSection key={section.id} section={section} locale={activeLocale} />;
          case "SHOP_BY_FRAGRANCE":
            return <ShopByFragranceSection key={section.id} section={section} locale={activeLocale} />;
          case "PROMO_BANNER":
            return <PromoBannerSection key={section.id} section={section} locale={activeLocale} />;
          case "ABOUT":
            return <AboutSection key={section.id} section={section} locale={activeLocale} />;
          case "NEWSLETTER":
            return <NewsletterSection key={section.id} section={section} locale={activeLocale} />;
          default:
            return null;
        }
      })}
    </>
  );
}
