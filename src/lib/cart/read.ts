import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { customerAuth } from "@/lib/auth/customer-auth";

export const CART_COOKIE_NAME = "mah-cart-token";

export interface CartItemDetail {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  unitPrice: number;
  name: string;
  slug: string;
  image: string | null;
  availableStock: number;
}

export interface CartWithItems {
  id: string | null;
  items: CartItemDetail[];
  subtotal: number;
}

async function currentCustomerId(): Promise<string | null> {
  const session = await customerAuth();
  const id = (session?.user as { id?: string } | undefined)?.id;
  return id ?? null;
}

export async function resolveCartId(guestToken?: string): Promise<string | null> {
  const customerId = guestToken ? null : await currentCustomerId();
  if (customerId) {
    const cart = await prisma.cart.findUnique({ where: { customerId }, select: { id: true } });
    return cart?.id ?? null;
  }

  const token = guestToken ?? (await cookies()).get(CART_COOKIE_NAME)?.value;
  if (!token) return null;
  const cart = await prisma.cart.findUnique({ where: { sessionToken: token }, select: { id: true } });
  return cart?.id ?? null;
}

export async function loadCartWithItems(cartId: string, locale: "en" | "fa"): Promise<CartWithItems> {
  const items = await prisma.cartItem.findMany({
    where: { cartId },
    include: {
      product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 } } },
      variant: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const detailed: CartItemDetail[] = items.map((item) => ({
    id: item.id,
    productId: item.productId,
    variantId: item.variantId,
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice),
    name:
      locale === "fa"
        ? item.variant?.nameFa ?? item.product.nameFa
        : item.variant?.nameEn ?? item.product.nameEn,
    slug: locale === "fa" ? item.product.slugFa : item.product.slugEn,
    image: item.product.images[0]?.url ?? null,
    availableStock: item.variant?.stockQuantity ?? item.product.stockQuantity,
  }));

  return {
    id: cartId,
    items: detailed,
    subtotal: detailed.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
  };
}

export async function getCart(locale: "en" | "fa"): Promise<CartWithItems> {
  const cartId = await resolveCartId();
  if (!cartId) return { id: null, items: [], subtotal: 0 };
  return loadCartWithItems(cartId, locale);
}

export async function getCartItemCount(): Promise<number> {
  const cartId = await resolveCartId();
  if (!cartId) return 0;
  const result = await prisma.cartItem.aggregate({ where: { cartId }, _sum: { quantity: true } });
  return result._sum.quantity ?? 0;
}
