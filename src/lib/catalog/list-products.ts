import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type SortOption = "featured" | "newest" | "bestselling" | "price-asc" | "price-desc" | "rating";

export interface ProductListFilters {
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  fragranceFamilyId?: string;
  color?: string;
  size?: string;
  inStock?: boolean;
  bestSeller?: boolean;
  newArrival?: boolean;
  onSale?: boolean;
  minRating?: number;
}

export interface ListProductsInput {
  locale: "en" | "fa";
  filters: ProductListFilters;
  sort: SortOption;
  page: number;
}

export interface ProductListItem {
  id: string;
  slug: string;
  sku: string;
  name: string;
  shortDescription: string | null;
  price: number;
  salePrice: number | null;
  primaryImage: string | null;
  hoverImage: string | null;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  stockQuantity: number;
  averageRating: number | null;
  reviewCount: number;
}

export interface ListProductsResult {
  products: ProductListItem[];
  total: number;
  page: number;
  pageCount: number;
}

export const PAGE_SIZE = 24;

const PRODUCT_LIST_SELECT = {
  id: true,
  slugEn: true,
  slugFa: true,
  sku: true,
  nameEn: true,
  nameFa: true,
  shortDescriptionEn: true,
  shortDescriptionFa: true,
  price: true,
  salePrice: true,
  isFeatured: true,
  isBestSeller: true,
  isNewArrival: true,
  stockQuantity: true,
  averageRating: true,
  reviewCount: true,
  images: { orderBy: { sortOrder: "asc" as const }, take: 2 },
} satisfies Prisma.ProductSelect;

type ProductListRow = Prisma.ProductGetPayload<{ select: typeof PRODUCT_LIST_SELECT }>;

function toProductListItem(row: ProductListRow, locale: "en" | "fa"): ProductListItem {
  return {
    id: row.id,
    slug: locale === "fa" ? row.slugFa : row.slugEn,
    sku: row.sku,
    name: locale === "fa" ? row.nameFa : row.nameEn,
    shortDescription: (locale === "fa" ? row.shortDescriptionFa : row.shortDescriptionEn) ?? null,
    price: Number(row.price),
    salePrice: row.salePrice !== null ? Number(row.salePrice) : null,
    primaryImage: row.images[0]?.url ?? null,
    hoverImage: row.images[1]?.url ?? row.images[0]?.url ?? null,
    isFeatured: row.isFeatured,
    isBestSeller: row.isBestSeller,
    isNewArrival: row.isNewArrival,
    stockQuantity: row.stockQuantity,
    averageRating: row.averageRating !== null ? Number(row.averageRating) : null,
    reviewCount: row.reviewCount,
  };
}

function buildWhere(filters: ProductListFilters): Prisma.ProductWhereInput {
  const where: Prisma.ProductWhereInput = { status: "PUBLISHED", deletedAt: null };

  if (filters.categoryId) {
    where.categories = { some: { categoryId: filters.categoryId } };
  }
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    where.price = {
      ...(filters.minPrice !== undefined ? { gte: filters.minPrice } : {}),
      ...(filters.maxPrice !== undefined ? { lte: filters.maxPrice } : {}),
    };
  }
  if (filters.fragranceFamilyId) where.fragranceFamilyId = filters.fragranceFamilyId;
  if (filters.color) where.color = filters.color;
  if (filters.size) where.size = filters.size;
  if (filters.inStock) where.stockQuantity = { gt: 0 };
  if (filters.bestSeller) where.isBestSeller = true;
  if (filters.newArrival) where.isNewArrival = true;
  if (filters.onSale) where.salePrice = { not: null };
  if (filters.minRating !== undefined) where.averageRating = { gte: filters.minRating };

  return where;
}

function buildOrderBy(sort: SortOption): Prisma.ProductOrderByWithRelationInput[] {
  switch (sort) {
    case "newest":
      return [{ publishedAt: "desc" }, { createdAt: "desc" }];
    case "bestselling":
      return [{ isBestSeller: "desc" }, { createdAt: "desc" }];
    case "price-asc":
      return [{ price: "asc" }];
    case "price-desc":
      return [{ price: "desc" }];
    case "rating":
      return [{ averageRating: "desc" }, { reviewCount: "desc" }];
    case "featured":
    default:
      return [{ isFeatured: "desc" }, { createdAt: "desc" }];
  }
}

export async function listProducts(input: ListProductsInput): Promise<ListProductsResult> {
  const where = buildWhere(input.filters);
  const orderBy = buildOrderBy(input.sort);
  const page = Math.max(input.page, 1);
  const skip = (page - 1) * PAGE_SIZE;

  const [rows, total] = await Promise.all([
    prisma.product.findMany({ where, orderBy, skip, take: PAGE_SIZE, select: PRODUCT_LIST_SELECT }),
    prisma.product.count({ where }),
  ]);

  return {
    products: rows.map((row) => toProductListItem(row, input.locale)),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

export async function resolveCategoryBySlug(locale: "en" | "fa", slug: string) {
  return prisma.category.findFirst({
    where: locale === "fa" ? { slugFa: slug, isActive: true, deletedAt: null } : { slugEn: slug, isActive: true, deletedAt: null },
  });
}

export async function resolveFragranceFamilyBySlug(locale: "en" | "fa", slug: string) {
  return prisma.fragranceFamily.findFirst({
    where: locale === "fa" ? { slugFa: slug } : { slugEn: slug },
  });
}

export async function listActiveCategories(locale: "en" | "fa") {
  const categories = await prisma.category.findMany({
    where: { isActive: true, deletedAt: null },
    orderBy: { sortOrder: "asc" },
  });
  return categories.map((c) => ({
    id: c.id,
    slug: locale === "fa" ? c.slugFa : c.slugEn,
    name: locale === "fa" ? c.nameFa : c.nameEn,
    image: c.image,
    parentId: c.parentId,
  }));
}

export async function listFragranceFamilies(locale: "en" | "fa") {
  const families = await prisma.fragranceFamily.findMany({ orderBy: { nameEn: "asc" } });
  return families.map((f) => ({
    id: f.id,
    slug: locale === "fa" ? f.slugFa : f.slugEn,
    name: locale === "fa" ? f.nameFa : f.nameEn,
  }));
}
