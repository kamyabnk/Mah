import type { InventoryTransactionType, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const INVENTORY_PAGE_SIZE = 30;
export const TRANSACTIONS_PAGE_SIZE = 40;

export type StockView = "all" | "low" | "out";

export interface StockItem {
  /** Stable key for the adjustment action: which row of which table to move. */
  kind: "product" | "variant";
  id: string;
  nameEn: string;
  nameFa: string;
  sku: string;
  stockQuantity: number;
  lowStockThreshold: number;
  productId: string;
  productNameEn: string;
  productNameFa: string;
}

export interface StockListResult {
  items: StockItem[];
  total: number;
  page: number;
  pageCount: number;
}

/**
 * Stock lives in two tables: `Product.stockQuantity` for simple products and
 * `ProductVariant.stockQuantity` for variant ones (where the product column is
 * only a synced display aggregate). Listing both in one view means querying
 * each and merging — there is no single table to paginate over, so the merged
 * list is sliced in memory. The catalogue is small enough for that to be fine.
 */
export async function listStockItems(
  view: StockView,
  search: string | undefined,
  page: number
): Promise<StockListResult> {
  const productWhere: Prisma.ProductWhereInput = { deletedAt: null, hasVariants: false };
  const variantWhere: Prisma.ProductVariantWhereInput = { product: { deletedAt: null } };

  if (search) {
    productWhere.OR = [
      { nameEn: { contains: search, mode: "insensitive" } },
      { nameFa: { contains: search } },
      { sku: { contains: search, mode: "insensitive" } },
    ];
    variantWhere.OR = [
      { nameEn: { contains: search, mode: "insensitive" } },
      { nameFa: { contains: search } },
      { sku: { contains: search, mode: "insensitive" } },
    ];
  }

  if (view === "out") {
    productWhere.stockQuantity = 0;
    variantWhere.stockQuantity = 0;
  } else if (view === "low") {
    productWhere.stockQuantity = { gt: 0, lte: prisma.product.fields.lowStockThreshold };
    variantWhere.stockQuantity = { gt: 0, lte: prisma.productVariant.fields.lowStockThreshold };
  }

  const [products, variants] = await Promise.all([
    prisma.product.findMany({
      where: productWhere,
      select: {
        id: true,
        nameEn: true,
        nameFa: true,
        sku: true,
        stockQuantity: true,
        lowStockThreshold: true,
      },
    }),
    prisma.productVariant.findMany({
      where: variantWhere,
      select: {
        id: true,
        nameEn: true,
        nameFa: true,
        sku: true,
        stockQuantity: true,
        lowStockThreshold: true,
        productId: true,
        product: { select: { nameEn: true, nameFa: true } },
      },
    }),
  ]);

  const merged: StockItem[] = [
    ...products.map((product) => ({
      kind: "product" as const,
      id: product.id,
      nameEn: product.nameEn,
      nameFa: product.nameFa,
      sku: product.sku,
      stockQuantity: product.stockQuantity,
      lowStockThreshold: product.lowStockThreshold,
      productId: product.id,
      productNameEn: product.nameEn,
      productNameFa: product.nameFa,
    })),
    ...variants.map((variant) => ({
      kind: "variant" as const,
      id: variant.id,
      nameEn: variant.nameEn,
      nameFa: variant.nameFa,
      sku: variant.sku,
      stockQuantity: variant.stockQuantity,
      lowStockThreshold: variant.lowStockThreshold,
      productId: variant.productId,
      productNameEn: variant.product.nameEn,
      productNameFa: variant.product.nameFa,
    })),
  ].sort((a, b) => a.stockQuantity - b.stockQuantity || a.sku.localeCompare(b.sku));

  const safePage = Math.max(1, page);
  return {
    items: merged.slice((safePage - 1) * INVENTORY_PAGE_SIZE, safePage * INVENTORY_PAGE_SIZE),
    total: merged.length,
    page: safePage,
    pageCount: Math.max(1, Math.ceil(merged.length / INVENTORY_PAGE_SIZE)),
  };
}

export interface TransactionRow {
  id: string;
  type: InventoryTransactionType;
  quantityChange: number;
  resultingQuantity: number;
  note: string | null;
  createdAt: Date;
  adminName: string | null;
  productId: string;
  productNameEn: string;
  productNameFa: string;
  variantNameEn: string | null;
  variantNameFa: string | null;
  orderNumber: string | null;
}

export async function listInventoryTransactions(
  productId: string | undefined,
  page: number
): Promise<{ rows: TransactionRow[]; total: number; page: number; pageCount: number }> {
  const where: Prisma.InventoryTransactionWhereInput = productId ? { productId } : {};
  const safePage = Math.max(1, page);

  const [total, transactions] = await Promise.all([
    prisma.inventoryTransaction.count({ where }),
    prisma.inventoryTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (safePage - 1) * TRANSACTIONS_PAGE_SIZE,
      take: TRANSACTIONS_PAGE_SIZE,
      select: {
        id: true,
        type: true,
        quantityChange: true,
        resultingQuantity: true,
        note: true,
        createdAt: true,
        productId: true,
        product: { select: { nameEn: true, nameFa: true } },
        variant: { select: { nameEn: true, nameFa: true } },
        createdByAdmin: { select: { name: true } },
        orderItem: { select: { order: { select: { orderNumber: true } } } },
      },
    }),
  ]);

  return {
    rows: transactions.map((transaction) => ({
      id: transaction.id,
      type: transaction.type,
      quantityChange: transaction.quantityChange,
      resultingQuantity: transaction.resultingQuantity,
      note: transaction.note,
      createdAt: transaction.createdAt,
      adminName: transaction.createdByAdmin?.name ?? null,
      productId: transaction.productId,
      productNameEn: transaction.product.nameEn,
      productNameFa: transaction.product.nameFa,
      variantNameEn: transaction.variant?.nameEn ?? null,
      variantNameFa: transaction.variant?.nameFa ?? null,
      orderNumber: transaction.orderItem?.order.orderNumber ?? null,
    })),
    total,
    page: safePage,
    pageCount: Math.max(1, Math.ceil(total / TRANSACTIONS_PAGE_SIZE)),
  };
}

export async function getTransactionFilterProducts() {
  return prisma.product.findMany({
    where: { deletedAt: null },
    orderBy: { nameEn: "asc" },
    select: { id: true, nameEn: true, nameFa: true },
  });
}
