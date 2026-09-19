"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { AddToCartButton } from "./add-to-cart-button";

export interface VariantOption {
  id: string;
  name: string;
  size: string | null;
  color: string | null;
  price: number | null;
  salePrice: number | null;
  stockQuantity: number;
}

export function VariantSelector({
  productId,
  variants,
  fallbackPrice,
  fallbackSalePrice,
  fallbackStock,
  currencyLabel,
}: {
  productId: string;
  variants: VariantOption[];
  fallbackPrice: number;
  fallbackSalePrice: number | null;
  fallbackStock: number;
  currencyLabel: string;
}) {
  const t = useTranslations("common");
  const [selectedId, setSelectedId] = useState(variants[0]?.id);
  const selected = variants.find((v) => v.id === selectedId);

  const price = selected ? selected.salePrice ?? selected.price ?? fallbackPrice : fallbackSalePrice ?? fallbackPrice;
  const stock = selected ? selected.stockQuantity : fallbackStock;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {variants.map((variant) => (
          <button
            key={variant.id}
            type="button"
            onClick={() => setSelectedId(variant.id)}
            className={cn(
              "rounded-sm border px-4 py-2 text-sm",
              variant.id === selectedId ? "border-amber bg-amber/10 text-espresso" : "border-espresso/20 text-espresso-light"
            )}
          >
            {variant.name}
          </button>
        ))}
      </div>
      <span className="font-medium text-espresso">
        {price.toLocaleString()} {currencyLabel}
      </span>
      <span className="text-sm text-espresso-light">
        {stock > 0 ? t("inStock") : t("outOfStock")}
      </span>
      <AddToCartButton productId={productId} variantId={selectedId} disabled={stock <= 0} />
    </div>
  );
}
