import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { addToCart, removeFromCart, updateCartItemQuantity } from "@/lib/cart/actions";

const testSkuPrefix = "TEST-CART-";
let productId: string;
let outOfStockProductId: string;
const guestToken = "test-cart-guest-token";

beforeAll(async () => {
  const product = await prisma.product.create({
    data: {
      slugEn: "test-cart-product-en",
      slugFa: "test-cart-product-fa",
      sku: `${testSkuPrefix}IN-STOCK`,
      nameEn: "Test Cart Candle",
      nameFa: "شمع تست سبد خرید",
      status: "PUBLISHED",
      price: 300000,
      stockQuantity: 5,
    },
  });
  productId = product.id;

  const outOfStock = await prisma.product.create({
    data: {
      slugEn: "test-cart-oos-en",
      slugFa: "test-cart-oos-fa",
      sku: `${testSkuPrefix}OUT-OF-STOCK`,
      nameEn: "Test Sold Out Candle",
      nameFa: "شمع تست ناموجود",
      status: "PUBLISHED",
      price: 200000,
      stockQuantity: 0,
    },
  });
  outOfStockProductId = outOfStock.id;
});

afterAll(async () => {
  await prisma.cartItem.deleteMany({ where: { product: { sku: { startsWith: testSkuPrefix } } } });
  await prisma.cart.deleteMany({ where: { sessionToken: guestToken } });
  await prisma.product.deleteMany({ where: { sku: { startsWith: testSkuPrefix } } });
  await prisma.$disconnect();
});

describe("cart actions (guest cart via injected token)", () => {
  it("adds a product to a new guest cart", async () => {
    const result = await addToCart({ productId, quantity: 2 }, { guestToken });
    expect(result.ok).toBe(true);

    const cart = await prisma.cart.findUnique({ where: { sessionToken: guestToken }, include: { items: true } });
    expect(cart?.items).toHaveLength(1);
    expect(cart?.items[0]?.quantity).toBe(2);
  });

  it("increments quantity when adding the same product again", async () => {
    await addToCart({ productId, quantity: 1 }, { guestToken });
    const cart = await prisma.cart.findUnique({ where: { sessionToken: guestToken }, include: { items: true } });
    expect(cart?.items[0]?.quantity).toBe(3);
  });

  it("caps quantity at available stock instead of overselling", async () => {
    const result = await addToCart({ productId, quantity: 100 }, { guestToken });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.cappedAt).toBe(5);
    const cart = await prisma.cart.findUnique({ where: { sessionToken: guestToken }, include: { items: true } });
    expect(cart?.items[0]?.quantity).toBe(5);
  });

  it("refuses to add an out-of-stock product", async () => {
    const result = await addToCart({ productId: outOfStockProductId, quantity: 1 }, { guestToken });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toBe("OUT_OF_STOCK");
  });

  it("updates an item's quantity", async () => {
    const cart = await prisma.cart.findUnique({ where: { sessionToken: guestToken }, include: { items: true } });
    const item = cart!.items[0]!;
    const result = await updateCartItemQuantity({ cartItemId: item.id, quantity: 2 }, { guestToken });
    expect(result.ok).toBe(true);
    const updated = await prisma.cartItem.findUnique({ where: { id: item.id } });
    expect(updated?.quantity).toBe(2);
  });

  it("removes an item", async () => {
    const cart = await prisma.cart.findUnique({ where: { sessionToken: guestToken }, include: { items: true } });
    const item = cart!.items[0]!;
    await removeFromCart({ cartItemId: item.id }, { guestToken });
    const remaining = await prisma.cartItem.findMany({ where: { cartId: cart!.id } });
    expect(remaining).toHaveLength(0);
  });
});
