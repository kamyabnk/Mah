import { prisma } from "@/lib/prisma";

export async function getProductBySlug(locale: "en" | "fa", slug: string) {
  const product = await prisma.product.findFirst({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      ...(locale === "fa" ? { slugFa: slug } : { slugEn: slug }),
    },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      variants: { where: { isActive: true }, orderBy: { createdAt: "asc" } },
      fragranceFamily: true,
      categories: { include: { category: true } },
      reviews: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { customer: { select: { firstName: true, lastName: true } } },
      },
    },
  });
  return product;
}

export async function getRelatedProducts(
  locale: "en" | "fa",
  productId: string,
  categoryIds: string[],
  fragranceFamilyId: string | null,
  limit = 6
) {
  const rows = await prisma.product.findMany({
    where: {
      status: "PUBLISHED",
      deletedAt: null,
      id: { not: productId },
      OR: [
        categoryIds.length > 0 ? { categories: { some: { categoryId: { in: categoryIds } } } } : undefined,
        fragranceFamilyId ? { fragranceFamilyId } : undefined,
      ].filter((clause): clause is NonNullable<typeof clause> => Boolean(clause)),
    },
    orderBy: { isFeatured: "desc" },
    take: limit,
    select: {
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
      images: { orderBy: { sortOrder: "asc" }, take: 2 },
    },
  });

  return rows.map((row) => ({
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
  }));
}
