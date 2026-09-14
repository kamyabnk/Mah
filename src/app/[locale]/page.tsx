import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";

export default function HomePage() {
  const t = useTranslations("common");

  return (
    <Container className="flex min-h-[70vh] flex-col items-center justify-center gap-6 text-center">
      <Heading level={1}>{t("brandName")}</Heading>
      <Text className="max-w-md">{t("tagline")}</Text>
      <Text className="max-w-md">{t("comingSoon")}</Text>
      <Link
        href="/design-system"
        className="inline-flex h-11 items-center justify-center rounded-sm bg-amber px-6 text-base font-medium text-ivory transition-colors hover:bg-amber/90"
      >
        {t("viewDesignSystem")}
      </Link>
    </Container>
  );
}
