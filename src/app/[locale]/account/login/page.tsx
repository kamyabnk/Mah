"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { loginCustomer, type FormState } from "@/lib/customer/actions";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Link } from "@/i18n/navigation";

const initialState: FormState = {};

export default function LoginPage() {
  const t = useTranslations("account");
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [state, formAction, isPending] = useActionState(loginCustomer, initialState);

  return (
    <Container className="flex max-w-md flex-col gap-6 py-16">
      <Heading level={1}>{t("loginTitle")}</Heading>
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <Input type="email" name="email" placeholder={t("email")} required />
        <Input type="password" name="password" placeholder={t("password")} required />
        {state.error && <Text className="text-sm text-terracotta">{state.error}</Text>}
        <Button type="submit" disabled={isPending}>
          {isPending ? t("submitting") : t("loginCta")}
        </Button>
      </form>
      <Text>
        {t("noAccount")}{" "}
        <Link href="/account/register" className="text-amber underline">
          {t("registerCta")}
        </Link>
      </Text>
    </Container>
  );
}
