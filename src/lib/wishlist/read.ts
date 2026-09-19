import { prisma } from "@/lib/prisma";
import { customerAuth } from "@/lib/auth/customer-auth";

async function currentCustomerId(): Promise<string | null> {
  const session = await customerAuth();
  const id = (session?.user as { id?: string } | undefined)?.id;
  return id ?? null;
}

export async function getWishlistProductIds(): Promise<Set<string>> {
  const customerId = await currentCustomerId();
  if (!customerId) return new Set();
  const items = await prisma.wishlistItem.findMany({ where: { customerId }, select: { productId: true } });
  return new Set(items.map((item) => item.productId));
}

export interface WishlistItemDetail {
  productId: string;
  slug: string;
  name: string;
  price: number;
  salePrice: number | null;
  image: string | null;
  stockQuantity: number;
}

export async function getWishlist(locale: "en" | "fa"): Promise<WishlistItemDetail[]> {
  const customerId = await currentCustomerId();
  if (!customerId) return [];

  const items = await prisma.wishlistItem.findMany({
    where: { customerId },
    include: {
      product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return items.map(({ product }) => ({
    productId: product.id,
    slug: locale === "fa" ? product.slugFa : product.slugEn,
    name: locale === "fa" ? product.nameFa : product.nameEn,
    price: Number(product.price),
    salePrice: product.salePrice !== null ? Number(product.salePrice) : null,
    image: product.images[0]?.url ?? null,
    stockQuantity: product.stockQuantity,
  }));
}
