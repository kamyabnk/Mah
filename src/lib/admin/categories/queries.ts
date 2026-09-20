import { prisma } from "@/lib/prisma";

export interface AdminCategoryRow {
  id: string;
  nameEn: string;
  nameFa: string;
  slugEn: string;
  parentId: string | null;
  parentNameEn: string | null;
  parentNameFa: string | null;
  isActive: boolean;
  sortOrder: number;
  productCount: number;
  image: string | null;
  /** Nesting depth, so the list can indent children under their parent. */
  depth: number;
}

/**
 * Returns every category ordered as a tree: each parent immediately followed by
 * its descendants. The catalogue is small enough to sort in memory, which keeps
 * the ordering rule in one readable place instead of a recursive CTE.
 */
export async function listAdminCategories(): Promise<AdminCategoryRow[]> {
  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
    select: {
      id: true,
      nameEn: true,
      nameFa: true,
      slugEn: true,
      parentId: true,
      isActive: true,
      sortOrder: true,
      image: true,
      parent: { select: { nameEn: true, nameFa: true } },
      _count: { select: { products: true } },
    },
  });

  const byParent = new Map<string | null, typeof categories>();
  for (const category of categories) {
    const key = category.parentId;
    const bucket = byParent.get(key);
    if (bucket) bucket.push(category);
    else byParent.set(key, [category]);
  }

  const rows: AdminCategoryRow[] = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const category of byParent.get(parentId) ?? []) {
      rows.push({
        id: category.id,
        nameEn: category.nameEn,
        nameFa: category.nameFa,
        slugEn: category.slugEn,
        parentId: category.parentId,
        parentNameEn: category.parent?.nameEn ?? null,
        parentNameFa: category.parent?.nameFa ?? null,
        isActive: category.isActive,
        sortOrder: category.sortOrder,
        productCount: category._count.products,
        image: category.image,
        depth,
      });
      walk(category.id, depth + 1);
    }
  };
  walk(null, 0);

  // A category whose parent was soft-deleted would otherwise vanish from the
  // tree walk; append any such orphans so they stay editable.
  const seen = new Set(rows.map((row) => row.id));
  for (const category of categories) {
    if (seen.has(category.id)) continue;
    rows.push({
      id: category.id,
      nameEn: category.nameEn,
      nameFa: category.nameFa,
      slugEn: category.slugEn,
      parentId: category.parentId,
      parentNameEn: category.parent?.nameEn ?? null,
      parentNameFa: category.parent?.nameFa ?? null,
      isActive: category.isActive,
      sortOrder: category.sortOrder,
      productCount: category._count.products,
      image: category.image,
      depth: 0,
    });
  }

  return rows;
}

export async function getAdminCategory(id: string) {
  const category = await prisma.category.findFirst({
    where: { id, deletedAt: null },
    include: {
      products: {
        select: {
          product: { select: { id: true, nameEn: true, nameFa: true, sku: true } },
        },
      },
    },
  });
  if (!category) return null;

  return {
    ...category,
    assignedProducts: category.products.map((row) => row.product),
  };
}

export type AdminCategoryDetail = NonNullable<Awaited<ReturnType<typeof getAdminCategory>>>;

/**
 * Candidate parents for `categoryId`: every other category, minus its own
 * descendants (which would create a cycle). `null` lists all categories.
 */
export async function getParentOptions(categoryId: string | null) {
  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
    select: { id: true, nameEn: true, nameFa: true, parentId: true },
  });

  if (!categoryId) return categories;

  const descendants = new Set<string>([categoryId]);
  let grew = true;
  while (grew) {
    grew = false;
    for (const category of categories) {
      if (category.parentId && descendants.has(category.parentId) && !descendants.has(category.id)) {
        descendants.add(category.id);
        grew = true;
      }
    }
  }

  return categories.filter((category) => !descendants.has(category.id));
}

export async function getAssignableProducts(categoryId: string) {
  return prisma.product.findMany({
    where: { deletedAt: null, categories: { none: { categoryId } } },
    orderBy: { nameEn: "asc" },
    select: { id: true, nameEn: true, nameFa: true, sku: true },
    take: 200,
  });
}
