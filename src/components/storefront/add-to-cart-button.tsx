"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { addToCart } from "@/lib/cart/actions";
import { Button } from "@/components/ui/button";

interface AddToCartButtonProps {
  productId: string;
  variantId?: string;
  disabled?: boolean;
  quantity?: number;
}

export function AddToCartButton({ productId, variantId, disabled, quantity = 1 }: AddToCartButtonProps) {
  const t = useTranslations("common");
  const [isPending, startTransition] = useTransition();
  const [added, setAdded] = useOptimistic(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <Button
      type="button"
      disabled={disabled || isPending}
      onClick={() => {
        setError(null);
        startTransition(async () => {
          setAdded(true);
          const result = await addToCart({ productId, variantId, quantity });
          if (!result.ok) {
            setAdded(false);
            setError(t("outOfStock"));
          }
        });
      }}
    >
      {disabled ? t("outOfStock") : error ?? (added ? t("addedToCart") : t("addToCart"))}
    </Button>
  );
}
