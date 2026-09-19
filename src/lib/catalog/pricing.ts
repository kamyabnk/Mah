import type { Decimal } from "@prisma/client/runtime/library";

type Money = Decimal | number | string;

export function getEffectivePrice(product: { price: Money; salePrice: Money | null }): number {
  return product.salePrice !== null ? Number(product.salePrice) : Number(product.price);
}

export function getDiscountPercent(product: { price: Money; salePrice: Money | null }): number | null {
  if (product.salePrice === null) return null;
  const price = Number(product.price);
  const salePrice = Number(product.salePrice);
  if (price <= 0 || salePrice >= price) return null;
  return Math.round(((price - salePrice) / price) * 100);
}
