import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { ProductListItem } from "./list-products";

interface SearchRow {
  id: string;
  slugEn: string;
  slugFa: string;
  sku: string;
  nameEn: string;
  nameFa: string;
  shortDescriptionEn: string | null;
  shortDescriptionFa: string | null;
  price: Prisma.Decimal;
  salePrice: Prisma.Decimal | null;
  isFeatured: boolean;
  isBestSeller: boolean;
  isNewArrival: boolean;
  stockQuantity: number;
  averageRating: Prisma.Decimal | null;
  reviewCount: number;
  primaryImage: string | null;
  hoverImage: string | null;
}

export interface SearchProductsResult {
  products: ProductListItem[];
  total: number;
}

const SEARCH_PAGE_SIZE = 24;

export async function searchProducts(
  locale: "en" | "fa",
  query: string,
  page = 1
): Promise<SearchProductsResult> {
  const trimmed = query.trim();
  if (!trimmed) return { products: [], total: 0 };

  const words = trimmed
    .split(/\s+/)
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter(Boolean);

  if (words.length === 0) return { products: [], total: 0 };

  const tsQuery = words.map((word) => `${word}:*`).join(" & ");
  const offset = (Math.max(page, 1) - 1) * SEARCH_PAGE_SIZE;

  const rows = await prisma.$queryRaw<SearchRow[]>`
    SELECT
      p.id, p."slugEn", p."slugFa", p.sku, p."nameEn", p."nameFa",
      p."shortDescriptionEn", p."shortDescriptionFa", p.price, p."salePrice",
      p."isFeatured", p."isBestSeller", p."isNewArrival", p."stockQuantity",
      p."averageRating", p."reviewCount",
      (SELECT url FROM "ProductImage" WHERE "productId" = p.id ORDER BY "sortOrder" ASC LIMIT 1) AS "primaryImage",
      (SELECT url FROM "ProductImage" WHERE "productId" = p.id ORDER BY "sortOrder" ASC OFFSET 1 LIMIT 1) AS "hoverImage"
    FROM "Product" p
    WHERE p.status = 'PUBLISHED'
      AND p."deletedAt" IS NULL
      AND p."searchVector" @@ to_tsquery('simple', ${tsQuery})
    ORDER BY ts_rank(p."searchVector", to_tsquery('simple', ${tsQuery})) DESC
    LIMIT ${SEARCH_PAGE_SIZE} OFFSET ${offset}
  `;

  const countRows = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint AS count
    FROM "Product" p
    WHERE p.status = 'PUBLISHED'
      AND p."deletedAt" IS NULL
      AND p."searchVector" @@ to_tsquery('simple', ${tsQuery})
  `;

  const products: ProductListItem[] = rows.map((row) => ({
    id: row.id,
    slug: locale === "fa" ? row.slugFa : row.slugEn,
    sku: row.sku,
    name: locale === "fa" ? row.nameFa : row.nameEn,
    shortDescription: (locale === "fa" ? row.shortDescriptionFa : row.shortDescriptionEn) ?? null,
    price: Number(row.price),
    salePrice: row.salePrice !== null ? Number(row.salePrice) : null,
    primaryImage: row.primaryImage,
    hoverImage: row.hoverImage ?? row.primaryImage,
    isFeatured: row.isFeatured,
    isBestSeller: row.isBestSeller,
    isNewArrival: row.isNewArrival,
    stockQuantity: row.stockQuantity,
    averageRating: row.averageRating !== null ? Number(row.averageRating) : null,
    reviewCount: row.reviewCount,
  }));

  return { products, total: Number(countRows[0]?.count ?? 0) };
}

export interface AutocompleteSuggestion {
  id: string;
  slug: string;
  name: string;
  image: string | null;
}

export async function autocompleteProducts(locale: "en" | "fa", query: string, limit = 6): Promise<AutocompleteSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const rows = await prisma.product.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      OR: [
        { nameEn: { contains: trimmed, mode: "insensitive" } },
        { nameFa: { contains: trimmed, mode: "insensitive" } },
        { sku: { contains: trimmed, mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      slugEn: true,
      slugFa: true,
      nameEn: true,
      nameFa: true,
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
    },
    take: limit,
  });

  return rows.map((row) => ({
    id: row.id,
    slug: locale === "fa" ? row.slugFa : row.slugEn,
    name: locale === "fa" ? row.nameFa : row.nameEn,
    image: row.images[0]?.url ?? null,
  }));
}
