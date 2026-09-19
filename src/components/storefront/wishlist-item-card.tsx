"use client";

import { useOptimistic, useTransition } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Text } from "@/components/ui/text";
import { Button } from "@/components/ui/button";
import { moveWishlistItemToCart, toggleWishlist } from "@/lib/wishlist/actions";
import type { WishlistItemDetail } from "@/lib/wishlist/read";

export function WishlistItemCard({ item, currencyLabel }: { item: WishlistItemDetail; currencyLabel: string }) {
  const t = useTranslations("wishlist");
  const [isPending, startTransition] = useTransition();
  const [removed, setRemoved] = useOptimistic(false);

  if (removed) return null;

  return (
    <div className="flex flex-col gap-2">
      <Link href={`/product/${item.slug}`} className="relative block aspect-square overflow-hidden rounded-md bg-ivory-dark/40">
        {item.image && <Image src={item.image} alt={item.name} fill sizes="25vw" className="object-cover" />}
      </Link>
      <Link href={`/product/${item.slug}`}>
        <Text className="font-medium text-espresso">{item.name}</Text>
      </Link>
      <Text className="text-sm">
        {(item.salePrice ?? item.price).toLocaleString()} {currencyLabel}
      </Text>
      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={isPending || item.stockQuantity <= 0}
          onClick={() => {
            startTransition(async () => {
              const result = await moveWishlistItemToCart(item.productId);
              if (result.ok) setRemoved(true);
            });
          }}
        >
          {t("moveToCart")}
        </Button>
        <button
          type="button"
          disabled={isPending}
          className="text-sm text-terracotta underline"
          onClick={() => {
            startTransition(async () => {
              setRemoved(true);
              await toggleWishlist(item.productId);
            });
          }}
        >
          {t("remove")}
        </button>
      </div>
    </div>
  );
}
