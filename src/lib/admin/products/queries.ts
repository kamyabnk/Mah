import type { Prisma, ProductStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toNullableNumber, toNumber } from "@/lib/admin/format";

export const PRODUCTS_PAGE_SIZE = 20;

export interface AdminProductListFilters {
  search?: string;
  status?: ProductStatus;
  categoryId?: string;
  page: number;
}

export interface AdminProductListRow {
  id: string;
  nameEn: string;
  nameFa: string;
  sku: string;
  status: ProductStatus;
  price: number;
  salePrice: number | null;
  stockQuantity: number;
  lowStockThreshold: number;
  hasVariants: boolean;
  variantCount: number;
  primaryImage: string | null;
  updatedAt: Date;
}

export interface AdminProductListResult {
  rows: AdminProductListRow[];
  total: number;
  page: number;
  pageCount: number;
}

export async function listAdminProducts(
  filters: AdminProductListFilters
): Promise<AdminProductListResult> {
  const where: Prisma.ProductWhereInput = { deletedAt: null };

  if (filters.search) {
    where.OR = [
      { nameEn: { contains: filters.search, mode: "insensitive" } },
      { nameFa: { contains: filters.search } },
      { sku: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  if (filters.status) where.status = filters.status;
  if (filters.categoryId) where.categories = { some: { categoryId: filters.categoryId } };

  const page = Math.max(1, filters.page);

  const [total, products] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * PRODUCTS_PAGE_SIZE,
      take: PRODUCTS_PAGE_SIZE,
      select: {
        id: true,
        nameEn: true,
        nameFa: true,
        sku: true,
        status: true,
        price: true,
        salePrice: true,
        stockQuantity: true,
        lowStockThreshold: true,
        hasVariants: true,
        updatedAt: true,
        _count: { select: { variants: true } },
        images: {
          where: { isPrimary: true },
          select: { url: true },
          take: 1,
        },
      },
    }),
  ]);

  return {
    rows: products.map((product) => ({
      id: product.id,
      nameEn: product.nameEn,
      nameFa: product.nameFa,
      sku: product.sku,
      status: product.status,
      price: toNumber(product.price),
      salePrice: toNullableNumber(product.salePrice),
      stockQuantity: product.stockQuantity,
      lowStockThreshold: product.lowStockThreshold,
      hasVariants: product.hasVariants,
      variantCount: product._count.variants,
      primaryImage: product.images[0]?.url ?? null,
      updatedAt: product.updatedAt,
    })),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PRODUCTS_PAGE_SIZE)),
  };
}

export interface ProductDimensions {
  length: number | null;
  width: number | null;
  height: number | null;
}

function parseDimensions(value: Prisma.JsonValue | null): ProductDimensions {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { length: null, width: null, height: null };
  }
  const record = value as Record<string, unknown>;
  const read = (key: string): number | null => {
    const raw = record[key];
    const parsed = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  };
  return { length: read("length"), width: read("width"), height: read("height") };
}

export async function getAdminProduct(id: string) {
  const product = await prisma.product.findFirst({
    where: { id, deletedAt: null },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { orderBy: { createdAt: "asc" } },
      categories: { select: { categoryId: true } },
      tags: { select: { tagId: true } },
    },
  });
  if (!product) return null;

  return {
    ...product,
    price: toNumber(product.price),
    salePrice: toNullableNumber(product.salePrice),
    costPrice: toNullableNumber(product.costPrice),
    weight: toNullableNumber(product.weight),
    parsedDimensions: parseDimensions(product.dimensions),
    categoryIds: product.categories.map((row) => row.categoryId),
    tagIds: product.tags.map((row) => row.tagId),
    variants: product.variants.map((variant) => ({
      ...variant,
      price: toNullableNumber(variant.price),
      salePrice: toNullableNumber(variant.salePrice),
      weight: toNullableNumber(variant.weight),
    })),
  };
}

export type AdminProductDetail = NonNullable<Awaited<ReturnType<typeof getAdminProduct>>>;

export interface ProductFormOptions {
  categories: { id: string; nameEn: string; nameFa: string }[];
  fragranceFamilies: { id: string; nameEn: string; nameFa: string }[];
  tags: { id: string; nameEn: string; nameFa: string }[];
}

export async function getProductFormOptions(): Promise<ProductFormOptions> {
  const [categories, fragranceFamilies, tags] = await Promise.all([
    prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
      select: { id: true, nameEn: true, nameFa: true },
    }),
    prisma.fragranceFamily.findMany({
      orderBy: { nameEn: "asc" },
      select: { id: true, nameEn: true, nameFa: true },
    }),
    prisma.tag.findMany({
      orderBy: { nameEn: "asc" },
      select: { id: true, nameEn: true, nameFa: true },
    }),
  ]);
  return { categories, fragranceFamilies, tags };
}
