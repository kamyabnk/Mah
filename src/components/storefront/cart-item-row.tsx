"use client";

import { useOptimistic, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Text } from "@/components/ui/text";
import { QuantityStepper } from "./quantity-stepper";
import { removeFromCart, updateCartItemQuantity } from "@/lib/cart/actions";
import type { CartItemDetail } from "@/lib/cart/read";

export function CartItemRow({ item, currencyLabel }: { item: CartItemDetail; currencyLabel: string }) {
  const t = useTranslations("cart");
  const [isPending, startTransition] = useTransition();
  const [quantity, setQuantity] = useOptimistic(item.quantity);
  const [removed, setRemoved] = useOptimistic(false);

  if (removed) return null;

  return (
    <div className="flex items-center justify-between gap-4 border-b border-espresso/10 pb-4">
      <div className="flex flex-1 flex-col gap-1">
        <Link href={`/product/${item.slug}`}>
          <Text className="font-medium text-espresso">{item.name}</Text>
        </Link>
        <Text className="text-sm">
          {item.unitPrice.toLocaleString()} {currencyLabel}
        </Text>
      </div>
      <QuantityStepper
        value={quantity}
        max={item.availableStock}
        onChange={(next) => {
          startTransition(async () => {
            setQuantity(next);
            await updateCartItemQuantity({ cartItemId: item.id, quantity: next });
          });
        }}
      />
      <Text className="w-24 text-right font-medium text-espresso">
        {(item.unitPrice * quantity).toLocaleString()} {currencyLabel}
      </Text>
      <button
        type="button"
        disabled={isPending}
        className="text-sm text-terracotta underline"
        onClick={() => {
          startTransition(async () => {
            setRemoved(true);
            await removeFromCart({ cartItemId: item.id });
          });
        }}
      >
        {t("remove")}
      </button>
    </div>
  );
}
