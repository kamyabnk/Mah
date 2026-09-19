"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { registerCustomer, type FormState } from "@/lib/customer/actions";
import { Container } from "@/components/ui/container";
import { Heading } from "@/components/ui/heading";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Link } from "@/i18n/navigation";

const initialState: FormState = {};

export default function RegisterPage() {
  const t = useTranslations("account");
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/";
  const [state, formAction, isPending] = useActionState(registerCustomer, initialState);

  return (
    <Container className="flex max-w-md flex-col gap-6 py-16">
      <Heading level={1}>{t("registerTitle")}</Heading>
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl} />
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1">
            <Input name="firstName" placeholder={t("firstName")} required />
            {state.fieldErrors?.firstName && (
              <Text className="text-sm text-terracotta">{state.fieldErrors.firstName}</Text>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <Input name="lastName" placeholder={t("lastName")} required />
            {state.fieldErrors?.lastName && (
              <Text className="text-sm text-terracotta">{state.fieldErrors.lastName}</Text>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <Input type="email" name="email" placeholder={t("email")} required />
          {state.fieldErrors?.email && <Text className="text-sm text-terracotta">{state.fieldErrors.email}</Text>}
        </div>
        <Input type="tel" name="phone" placeholder={t("phoneOptional")} />
        <div className="flex flex-col gap-1">
          <Input type="password" name="password" placeholder={t("password")} required />
          {state.fieldErrors?.password && (
            <Text className="text-sm text-terracotta">{state.fieldErrors.password}</Text>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <Input type="password" name="confirmPassword" placeholder={t("confirmPassword")} required />
          {state.fieldErrors?.confirmPassword && (
            <Text className="text-sm text-terracotta">{state.fieldErrors.confirmPassword}</Text>
          )}
        </div>
        {state.error && <Text className="text-sm text-terracotta">{state.error}</Text>}
        <Button type="submit" disabled={isPending}>
          {isPending ? t("submitting") : t("registerCta")}
        </Button>
      </form>
      <Text>
        {t("haveAccount")}{" "}
        <Link href="/account/login" className="text-amber underline">
          {t("loginCta")}
        </Link>
      </Text>
    </Container>
  );
}
