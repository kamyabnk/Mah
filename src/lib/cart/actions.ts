"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { customerAuth } from "@/lib/auth/customer-auth";
import { CART_COOKIE_NAME, resolveCartId } from "./read";

interface ActionDeps {
  guestToken?: string;
}

async function currentCustomerId(): Promise<string | null> {
  const session = await customerAuth();
  const id = (session?.user as { id?: string } | undefined)?.id;
  return id ?? null;
}

async function getOrCreateCartId(deps: ActionDeps = {}): Promise<string> {
  const customerId = deps.guestToken ? null : await currentCustomerId();
  if (customerId) {
    const existing = await prisma.cart.findUnique({ where: { customerId }, select: { id: true } });
    if (existing) return existing.id;
    const created = await prisma.cart.create({ data: { customerId } });
    return created.id;
  }

  const cookieStore = deps.guestToken ? null : await cookies();
  const token = deps.guestToken ?? cookieStore?.get(CART_COOKIE_NAME)?.value;

  if (token) {
    const existing = await prisma.cart.findUnique({ where: { sessionToken: token }, select: { id: true } });
    if (existing) return existing.id;
    const created = await prisma.cart.create({ data: { sessionToken: token } });
    return created.id;
  }

  const newToken = crypto.randomUUID();
  const created = await prisma.cart.create({ data: { sessionToken: newToken } });
  cookieStore?.set(CART_COOKIE_NAME, newToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return created.id;
}

function revalidateCart(deps: ActionDeps): void {
  if (deps.guestToken) return; // test seam: no request/render context to revalidate outside Next.js
  revalidatePath("/[locale]/cart", "page");
  revalidatePath("/[locale]", "layout");
}

async function getAvailableStockAndPrice(
  productId: string,
  variantId?: string
): Promise<{ stock: number; unitPrice: number }> {
  if (variantId) {
    const variant = await prisma.productVariant.findUniqueOrThrow({ where: { id: variantId } });
    const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
    return {
      stock: variant.stockQuantity,
      unitPrice: Number(variant.salePrice ?? variant.price ?? product.price),
    };
  }
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  return { stock: product.stockQuantity, unitPrice: Number(product.salePrice ?? product.price) };
}

export type AddToCartResult = { ok: true; cappedAt: number | null } | { ok: false; error: "OUT_OF_STOCK" };

export async function addToCart(
  input: { productId: string; variantId?: string; quantity: number },
  deps: ActionDeps = {}
): Promise<AddToCartResult> {
  const { stock, unitPrice } = await getAvailableStockAndPrice(input.productId, input.variantId);
  if (stock <= 0) return { ok: false, error: "OUT_OF_STOCK" };

  const cartId = await getOrCreateCartId(deps);
  const existing = await prisma.cartItem.findFirst({
    where: { cartId, productId: input.productId, variantId: input.variantId ?? null },
  });

  const desiredQuantity = (existing?.quantity ?? 0) + input.quantity;
  const cappedQuantity = Math.min(desiredQuantity, stock);

  if (existing) {
    await prisma.cartItem.update({ where: { id: existing.id }, data: { quantity: cappedQuantity, unitPrice } });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId,
        productId: input.productId,
        variantId: input.variantId ?? null,
        quantity: cappedQuantity,
        unitPrice,
      },
    });
  }

  revalidateCart(deps);
  return { ok: true, cappedAt: cappedQuantity < desiredQuantity ? cappedQuantity : null };
}

export async function updateCartItemQuantity(
  input: { cartItemId: string; quantity: number },
  deps: ActionDeps = {}
): Promise<{ ok: true } | { ok: false; error: "NOT_FOUND" }> {
  const cartId = await resolveCartId(deps.guestToken);
  const item = await prisma.cartItem.findFirst({ where: { id: input.cartItemId, cartId: cartId ?? undefined } });
  if (!item) return { ok: false, error: "NOT_FOUND" };

  const { stock } = await getAvailableStockAndPrice(item.productId, item.variantId ?? undefined);
  if (input.quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: item.id } });
  } else {
    await prisma.cartItem.update({ where: { id: item.id }, data: { quantity: Math.min(input.quantity, stock) } });
  }

  revalidateCart(deps);
  return { ok: true };
}

export async function removeFromCart(
  input: { cartItemId: string },
  deps: ActionDeps = {}
): Promise<{ ok: true } | { ok: false; error: "NOT_FOUND" }> {
  const cartId = await resolveCartId(deps.guestToken);
  const item = await prisma.cartItem.findFirst({ where: { id: input.cartItemId, cartId: cartId ?? undefined } });
  if (!item) return { ok: false, error: "NOT_FOUND" };

  await prisma.cartItem.delete({ where: { id: item.id } });
  revalidateCart(deps);
  return { ok: true };
}
