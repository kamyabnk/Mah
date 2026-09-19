import { getTranslations } from "next-intl/server";
import { Container } from "@/components/ui/container";
import { Text } from "@/components/ui/text";
import { Link } from "@/i18n/navigation";
import { NewsletterForm } from "./newsletter-form";

export async function SiteFooter({ locale }: { locale: "en" | "fa" }) {
  const t = await getTranslations({ locale, namespace: "footer" });
  const tCommon = await getTranslations({ locale, namespace: "common" });
  const tNewsletter = await getTranslations({ locale, namespace: "newsletter" });
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-espresso/10 bg-ivory-dark/40">
      <Container className="flex flex-col gap-8 py-12 sm:flex-row sm:justify-between">
        <div className="flex max-w-sm flex-col gap-3">
          <span className="font-display text-lg text-espresso">{tCommon("brandName")}</span>
          <Text className="text-sm">{t("about")}</Text>
        </div>
        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium text-espresso">{t("shop")}</span>
          <Link href="/candles" className="text-sm text-espresso-light">
            {t("shop")}
          </Link>
        </div>
        <NewsletterForm placeholder={tNewsletter("placeholder")} cta={tNewsletter("cta")} />
      </Container>
      <Container className="border-t border-espresso/10 py-4">
        <Text className="text-xs">{t("copyright", { year })}</Text>
      </Container>
    </footer>
  );
}
