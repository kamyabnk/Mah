import { useTranslations } from "next-intl";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function DesignSystemPage() {
  const t = useTranslations("common");

  return (
    <Container className="flex flex-col gap-10 py-16">
      <div>
        <Heading level={1}>{t("brandName")}</Heading>
        <Text>{t("tagline")}</Text>
      </div>

      <section className="flex flex-col gap-4">
        <Heading level={3}>Headings</Heading>
        <Heading level={1}>Heading 1</Heading>
        <Heading level={2}>Heading 2</Heading>
        <Heading level={3}>Heading 3</Heading>
        <Heading level={4}>Heading 4</Heading>
      </section>

      <section className="flex flex-col gap-4">
        <Heading level={3}>Buttons</Heading>
        <div className="flex flex-wrap gap-4">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <Heading level={3}>Badges</Heading>
        <div className="flex flex-wrap gap-3">
          <Badge variant="sale">Sale</Badge>
          <Badge variant="new">New</Badge>
          <Badge variant="bestseller">Best seller</Badge>
          <Badge variant="outOfStock">Out of stock</Badge>
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <Heading level={3}>Card &amp; input</Heading>
        <Card className="flex max-w-sm flex-col gap-4">
          <Text>A card container for product tiles and content blocks.</Text>
          <Input placeholder="you@example.com" />
        </Card>
      </section>
    </Container>
  );
}
