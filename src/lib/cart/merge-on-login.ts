import { prisma } from "@/lib/prisma";

export async function mergeGuestCartIntoCustomer(customerId: string, guestToken: string | null): Promise<void> {
  if (!guestToken) return;

  const guestCart = await prisma.cart.findUnique({ where: { sessionToken: guestToken }, include: { items: true } });
  if (!guestCart) return;

  const customerCart = await prisma.cart.upsert({
    where: { customerId },
    create: { customerId },
    update: {},
  });

  for (const item of guestCart.items) {
    const existing = await prisma.cartItem.findFirst({
      where: { cartId: customerCart.id, productId: item.productId, variantId: item.variantId },
    });
    if (existing) {
      await prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: existing.quantity + item.quantity },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: customerCart.id,
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        },
      });
    }
  }

  await prisma.cart.delete({ where: { id: guestCart.id } });
}
