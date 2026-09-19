"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { customerAuth } from "@/lib/auth/customer-auth";

export type ToggleWishlistResult =
  | { ok: true; wishlisted: boolean }
  | { ok: false; error: "UNAUTHENTICATED" };

export async function toggleWishlist(productId: string): Promise<ToggleWishlistResult> {
  const session = await customerAuth();
  const customerId = (session?.user as { id?: string } | undefined)?.id;
  if (!customerId) return { ok: false, error: "UNAUTHENTICATED" };

  const existing = await prisma.wishlistItem.findUnique({
    where: { customerId_productId: { customerId, productId } },
  });

  if (existing) {
    await prisma.wishlistItem.delete({ where: { id: existing.id } });
    revalidatePath("/[locale]/wishlist", "page");
    return { ok: true, wishlisted: false };
  }

  await prisma.wishlistItem.create({ data: { customerId, productId } });
  revalidatePath("/[locale]/wishlist", "page");
  return { ok: true, wishlisted: true };
}

export async function moveWishlistItemToCart(productId: string): Promise<{ ok: boolean }> {
  const { addToCart } = await import("@/lib/cart/actions");
  const result = await addToCart({ productId, quantity: 1 });
  if (!result.ok) return { ok: false };

  const session = await customerAuth();
  const customerId = (session?.user as { id?: string } | undefined)?.id;
  if (customerId) {
    await prisma.wishlistItem.deleteMany({ where: { customerId, productId } });
    revalidatePath("/[locale]/wishlist", "page");
  }
  return { ok: true };
}
