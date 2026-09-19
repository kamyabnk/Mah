import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { createOrder } from "@/lib/orders/create-order";

const skuPrefix = "TEST-ORDER-";
const address = {
  firstName: "Sara",
  lastName: "Ahmadi",
  phone: "09120000000",
  addressLine: "123 Test St",
  city: "Tehran",
  province: "Tehran",
  postalCode: "1234567890",
  country: "IR",
};

async function makeProduct(overrides: { stock: number; price?: number; sku: string }) {
  return prisma.product.create({
    data: {
      slugEn: `${overrides.sku.toLowerCase()}-en`,
      slugFa: `${overrides.sku.toLowerCase()}-fa`,
      sku: overrides.sku,
      nameEn: "Test Order Candle",
      nameFa: "شمع تست سفارش",
      status: "PUBLISHED",
      price: overrides.price ?? 200000,
      stockQuantity: overrides.stock,
    },
  });
}

async function makeCartWithItem(productId: string, quantity: number) {
  const cart = await prisma.cart.create({ data: { sessionToken: `test-order-cart-${crypto.randomUUID()}` } });
  const product = await prisma.product.findUniqueOrThrow({ where: { id: productId } });
  await prisma.cartItem.create({
    data: { cartId: cart.id, productId, quantity, unitPrice: Number(product.price) },
  });
  return cart;
}

afterAll(async () => {
  const orders = await prisma.order.findMany({ where: { items: { some: { sku: { startsWith: skuPrefix } } } } });
  const orderIds = orders.map((o) => o.id);
  await prisma.inventoryTransaction.deleteMany({ where: { orderItem: { order: { id: { in: orderIds } } } } });
  await prisma.orderStatusHistory.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.payment.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.cartItem.deleteMany({ where: { product: { sku: { startsWith: skuPrefix } } } });
  await prisma.cart.deleteMany({ where: { sessionToken: { startsWith: "test-order-cart-" } } });
  await prisma.product.deleteMany({ where: { sku: { startsWith: skuPrefix } } });
  await prisma.$disconnect();
});

describe("createOrder", () => {
  it("creates an order, decrements stock, and records an inventory transaction", async () => {
    const product = await makeProduct({ stock: 10, sku: `${skuPrefix}A` });
    const cart = await makeCartWithItem(product.id, 3);

    const result = await createOrder({
      cartId: cart.id,
      customerId: null,
      guestEmail: "guest@example.com",
      guestPhone: "0912",
      shippingAddress: address,
      couponCode: null,
      customerNote: null,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const order = await prisma.order.findUnique({
      where: { orderNumber: result.orderNumber },
      include: { items: true, payments: true, statusHistory: true },
    });
    expect(order?.status).toBe("PENDING");
    expect(order?.items).toHaveLength(1);
    expect(order?.items[0]?.quantity).toBe(3);
    expect(order?.payments[0]?.status).toBe("PENDING");
    expect(order?.statusHistory).toHaveLength(1);

    const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(updatedProduct.stockQuantity).toBe(7);

    const transaction = await prisma.inventoryTransaction.findFirst({ where: { productId: product.id } });
    expect(transaction?.type).toBe("SALE");
    expect(transaction?.quantityChange).toBe(-3);
    expect(transaction?.resultingQuantity).toBe(7);

    const cartAfter = await prisma.cartItem.findMany({ where: { cartId: cart.id } });
    expect(cartAfter).toHaveLength(0);
  });

  it("refuses to create an order when the cart quantity exceeds available stock, without partial side effects", async () => {
    const product = await makeProduct({ stock: 2, sku: `${skuPrefix}B` });
    const cart = await makeCartWithItem(product.id, 5);

    const result = await createOrder({
      cartId: cart.id,
      customerId: null,
      guestEmail: "guest@example.com",
      guestPhone: "0912",
      shippingAddress: address,
      couponCode: null,
      customerNote: null,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("INSUFFICIENT_STOCK");

    const unchangedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(unchangedProduct.stockQuantity).toBe(2);

    const orders = await prisma.order.findMany({ where: { items: { some: { productId: product.id } } } });
    expect(orders).toHaveLength(0);
  });

  it("applies a valid coupon and reduces the grand total", async () => {
    const product = await makeProduct({ stock: 10, price: 1000000, sku: `${skuPrefix}C` });
    const cart = await makeCartWithItem(product.id, 1);
    const coupon = await prisma.coupon.create({
      data: { code: `TESTCOUPON-${Date.now()}`, type: "PERCENTAGE", value: 10, appliedTo: "ALL", isActive: true },
    });

    const result = await createOrder({
      cartId: cart.id,
      customerId: null,
      guestEmail: "guest@example.com",
      guestPhone: "0912",
      shippingAddress: address,
      couponCode: coupon.code,
      customerNote: null,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const order = await prisma.order.findUniqueOrThrow({ where: { orderNumber: result.orderNumber } });
    expect(Number(order.discountTotal)).toBe(100000);
    expect(Number(order.grandTotal)).toBe(Number(order.subtotal) - 100000 + Number(order.shippingTotal));

    await prisma.coupon.delete({ where: { id: coupon.id } });
  });

  it("rejects an unknown coupon code without creating an order", async () => {
    const product = await makeProduct({ stock: 10, sku: `${skuPrefix}D` });
    const cart = await makeCartWithItem(product.id, 1);

    const result = await createOrder({
      cartId: cart.id,
      customerId: null,
      guestEmail: "guest@example.com",
      guestPhone: "0912",
      shippingAddress: address,
      couponCode: "DOES-NOT-EXIST",
      customerNote: null,
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("COUPON_NOT_FOUND");

    const unchangedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(unchangedProduct.stockQuantity).toBe(10);
  });

  it("prevents overselling when two orders race for the last unit of stock", async () => {
    const product = await makeProduct({ stock: 1, sku: `${skuPrefix}E` });
    const cartA = await makeCartWithItem(product.id, 1);
    const cartB = await makeCartWithItem(product.id, 1);

    const [resultA, resultB] = await Promise.all([
      createOrder({
        cartId: cartA.id,
        customerId: null,
        guestEmail: "a@example.com",
        guestPhone: "0912",
        shippingAddress: address,
        couponCode: null,
        customerNote: null,
      }),
      createOrder({
        cartId: cartB.id,
        customerId: null,
        guestEmail: "b@example.com",
        guestPhone: "0912",
        shippingAddress: address,
        couponCode: null,
        customerNote: null,
      }),
    ]);

    const outcomes = [resultA, resultB];
    const succeeded = outcomes.filter((r) => r.ok);
    const failed = outcomes.filter((r) => !r.ok);

    expect(succeeded).toHaveLength(1);
    expect(failed).toHaveLength(1);
    if (!failed[0]?.ok) expect(failed[0]?.error).toBe("INSUFFICIENT_STOCK");

    const finalProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(finalProduct.stockQuantity).toBe(0);
  });
});
