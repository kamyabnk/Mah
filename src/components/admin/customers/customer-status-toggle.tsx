"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { setCustomerActive } from "@/lib/admin/customers/actions";

export function CustomerStatusToggle({
  customerId,
  isActive,
}: {
  customerId: string;
  isActive: boolean;
}) {
  const t = useTranslations("admin.customers");
  const tCommon = useTranslations("admin.common");
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        type="button"
        size="sm"
        variant={isActive ? "secondary" : "primary"}
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await setCustomerActive(customerId, !isActive);
            if (!result.ok) {
              // A role with customers.view but not customers.manage lands here.
              setError(
                result.error === "UNAUTHORIZED"
                  ? tCommon("unauthorized")
                  : tCommon("unexpectedError")
              );
              return;
            }
            router.refresh();
          });
        }}
      >
        {isActive ? t("disable") : t("enable")}
      </Button>
      {error && <p className="text-xs text-terracotta">{error}</p>}
    </div>
  );
}
