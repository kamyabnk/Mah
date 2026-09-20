"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { loginAdmin } from "@/lib/admin/auth-actions";
import type { AdminFormState } from "@/lib/admin/action-result";

const initialState: AdminFormState = {};

export function AdminLoginForm({ locale }: { locale: string }) {
  const t = useTranslations("admin.login");
  const [state, formAction, isPending] = useActionState(loginAdmin, initialState);

  return (
    <div className="w-full max-w-sm rounded-md border border-espresso/10 bg-ivory p-8 shadow-sm">
      <p className="font-display text-sm uppercase tracking-[0.2em] text-amber">MAH</p>
      <h1 className="mt-2 font-display text-2xl font-medium text-espresso">{t("title")}</h1>
      <Text className="mt-2 text-sm">{t("subtitle")}</Text>

      <form action={formAction} className="mt-6 flex flex-col gap-4">
        <input type="hidden" name="locale" value={locale} />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-espresso">{t("email")}</span>
          <Input type="email" name="email" autoComplete="username" required />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-espresso">{t("password")}</span>
          <Input type="password" name="password" autoComplete="current-password" required />
        </label>

        {state.error && (
          <p role="alert" className="text-sm text-terracotta">
            {t(state.error === "invalidForm" ? "invalidForm" : "invalidCredentials")}
          </p>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending ? t("submitting") : t("submit")}
        </Button>
      </form>

      <Link href="/" className="mt-6 inline-block text-sm text-espresso-light underline">
        {t("backToStore")}
      </Link>
    </div>
  );
}
