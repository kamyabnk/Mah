import type { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type PrismaLike = PrismaClient | Prisma.TransactionClient;

/**
 * For `hasVariants` products, `Product.stockQuantity` is only a display
 * fallback — the real stock lives on each `ProductVariant`. The storefront's
 * listing and search queries read the aggregate column, so it must be kept
 * equal to SUM(variant stock) after every variant create/update/delete or the
 * "in stock" badges lie. Same pattern as `prisma/seed.ts`.
 *
 * No-ops for products that don't use variants, where the column is authoritative.
 */
export async function syncProductStockFromVariants(
  productId: string,
  client: PrismaLike = prisma
): Promise<number | null> {
  const product = await client.product.findUnique({
    where: { id: productId },
    select: { hasVariants: true },
  });
  if (!product?.hasVariants) return null;

  const aggregate = await client.productVariant.aggregate({
    where: { productId },
    _sum: { stockQuantity: true },
  });
  const total = aggregate._sum.stockQuantity ?? 0;

  await client.product.update({
    where: { id: productId },
    data: { stockQuantity: total },
  });

  return total;
}
