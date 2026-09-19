"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { submitCheckout, type CheckoutFormState } from "@/app/[locale]/checkout/actions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

const initialState: CheckoutFormState = {};

export function CheckoutForm() {
  const t = useTranslations("checkout");
  const [state, formAction, isPending] = useActionState(submitCheckout, initialState);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-4">
        <Input name="firstName" placeholder={t("firstName")} required />
        <Input name="lastName" placeholder={t("lastName")} required />
      </div>
      <Input type="tel" name="phone" placeholder={t("phone")} required />
      <Input type="email" name="email" placeholder={t("emailOptional")} />
      <Input name="addressLine" placeholder={t("address")} required />
      <div className="grid grid-cols-2 gap-4">
        <Input name="city" placeholder={t("city")} required />
        <Input name="province" placeholder={t("province")} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <Input name="postalCode" placeholder={t("postalCode")} required />
        <Input name="country" placeholder={t("country")} defaultValue="IR" required />
      </div>
      <Input name="couponCode" placeholder={t("couponCode")} />
      <textarea
        name="customerNote"
        placeholder={t("notes")}
        className="min-h-24 rounded-sm border border-espresso/20 bg-ivory px-4 py-3 text-base text-espresso"
      />
      {state.error && <Text className="text-sm text-terracotta">{t.has(`errors.${state.error}`) ? t(`errors.${state.error}`) : t("errors.GENERIC")}</Text>}
      <Button type="submit" disabled={isPending}>
        {isPending ? t("submitting") : t("placeOrder")}
      </Button>
    </form>
  );
}
