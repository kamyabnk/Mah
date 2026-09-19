import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { validateCoupon } from "@/lib/coupons/validate";
import { ManualPaymentProvider } from "@/lib/payments/manual-payment-provider";

const SHIPPING_COST = 50000;
const FREE_SHIPPING_THRESHOLD = 2000000;

export interface ShippingAddressInput {
  firstName: string;
  lastName: string;
  phone: string;
  addressLine: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
}

export interface CreateOrderInput {
  cartId: string;
  customerId: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  shippingAddress: ShippingAddressInput;
  couponCode: string | null;
  customerNote: string | null;
}

export type CreateOrderResult =
  | { ok: true; orderNumber: string }
  | { ok: false; error: string; productId?: string };

function generateOrderNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `MAH-${timestamp}-${random}`;
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const cart = await prisma.cart.findUnique({
    where: { id: input.cartId },
    include: {
      items: {
        include: {
          product: { include: { categories: true } },
          variant: true,
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    return { ok: false, error: "EMPTY_CART" };
  }

  try {
    const orderNumber = await prisma.$transaction(async (tx) => {
      // Re-validate stock and re-price every line server-side; never trust client-supplied prices/quantities.
      const lines = [];
      for (const item of cart.items) {
        const availableStock = item.variant ? item.variant.stockQuantity : item.product.stockQuantity;
        if (item.quantity > availableStock) {
          throw new StockError(item.productId, "INSUFFICIENT_STOCK");
        }

        const unitPrice = item.variant
          ? Number(item.variant.salePrice ?? item.variant.price ?? item.product.price)
          : Number(item.product.salePrice ?? item.product.price);

        lines.push({
          productId: item.productId,
          variantId: item.variantId,
          categoryIds: item.product.categories.map((c) => c.categoryId),
          quantity: item.quantity,
          unitPrice,
          lineTotal: unitPrice * item.quantity,
          productNameEn: item.product.nameEn,
          productNameFa: item.product.nameFa,
          variantNameEn: item.variant?.nameEn ?? null,
          variantNameFa: item.variant?.nameFa ?? null,
          sku: item.variant?.sku ?? item.product.sku,
        });
      }

      const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);

      let discountTotal = 0;
      let couponId: string | null = null;
      if (input.couponCode) {
        const coupon = await tx.coupon.findUnique({ where: { code: input.couponCode } });
        if (!coupon) throw new CheckoutError("COUPON_NOT_FOUND");

        const customerUsageCount = input.customerId
          ? await tx.couponUsage.count({ where: { couponId: coupon.id, customerId: input.customerId } })
          : 0;

        const validation = validateCoupon({
          coupon,
          subtotal,
          lines: lines.map((l) => ({ productId: l.productId, categoryIds: l.categoryIds, lineTotal: l.lineTotal })),
          customerUsageCount,
          perCustomerLimit: coupon.perCustomerLimit,
        });

        if (!validation.ok) throw new CheckoutError(validation.error);
        discountTotal = validation.discount;
        couponId = validation.couponId;
      }

      const shippingTotal = subtotal - discountTotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_COST;
      const taxTotal = 0;
      const grandTotal = subtotal - discountTotal + shippingTotal + taxTotal;

      const orderNumber = generateOrderNumber();

      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId: input.customerId,
          guestEmail: input.customerId ? null : input.guestEmail,
          guestPhone: input.customerId ? null : input.guestPhone,
          status: "PENDING",
          subtotal,
          discountTotal,
          shippingTotal,
          taxTotal,
          grandTotal,
          couponId,
          shippingAddress: input.shippingAddress as unknown as Prisma.InputJsonValue,
          customerNote: input.customerNote,
        },
      });

      await tx.orderStatusHistory.create({
        data: { orderId: order.id, status: "PENDING", note: "Order created" },
      });

      for (const line of lines) {
        const orderItem = await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: line.productId,
            variantId: line.variantId,
            productNameEn: line.productNameEn,
            productNameFa: line.productNameFa,
            variantLabelEn: line.variantNameEn,
            variantLabelFa: line.variantNameFa,
            sku: line.sku,
            unitPrice: line.unitPrice,
            quantity: line.quantity,
            lineTotal: line.lineTotal,
          },
        });

        // Conditional (compare-and-swap) update: atomic under Postgres row locking, safe against
        // concurrent purchases of the same product without an explicit SELECT ... FOR UPDATE.
        if (line.variantId) {
          const updated = await tx.productVariant.updateMany({
            where: { id: line.variantId, stockQuantity: { gte: line.quantity } },
            data: { stockQuantity: { decrement: line.quantity } },
          });
          if (updated.count === 0) throw new StockError(line.productId, "INSUFFICIENT_STOCK");
          const variant = await tx.productVariant.findUniqueOrThrow({ where: { id: line.variantId } });
          await tx.inventoryTransaction.create({
            data: {
              productId: line.productId,
              variantId: line.variantId,
              type: "SALE",
              quantityChange: -line.quantity,
              resultingQuantity: variant.stockQuantity,
              orderItemId: orderItem.id,
              note: `Order ${orderNumber}`,
            },
          });
        } else {
          const updated = await tx.product.updateMany({
            where: { id: line.productId, stockQuantity: { gte: line.quantity } },
            data: { stockQuantity: { decrement: line.quantity } },
          });
          if (updated.count === 0) throw new StockError(line.productId, "INSUFFICIENT_STOCK");
          const product = await tx.product.findUniqueOrThrow({ where: { id: line.productId } });
          await tx.inventoryTransaction.create({
            data: {
              productId: line.productId,
              type: "SALE",
              quantityChange: -line.quantity,
              resultingQuantity: product.stockQuantity,
              orderItemId: orderItem.id,
              note: `Order ${orderNumber}`,
            },
          });
        }
      }

      if (couponId) {
        // Per-customer usage tracking only applies to logged-in customers (CouponUsage.customerId
        // is a real FK to Customer); guests still get the discount, just without a usage row.
        if (input.customerId) {
          await tx.couponUsage.create({
            data: { couponId, customerId: input.customerId, orderId: order.id },
          });
        }
        await tx.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });
      }

      const provider = new ManualPaymentProvider();
      const paymentResult = await provider.createPayment({
        orderId: order.id,
        amount: grandTotal,
        currency: "IRT",
        idempotencyKey: `${order.id}-attempt-1`,
        callbackUrl: "",
      });

      await tx.payment.create({
        data: {
          orderId: order.id,
          provider: provider.key,
          status: "PENDING",
          amount: grandTotal,
          currency: "IRT",
          providerRef: paymentResult.providerRef,
          idempotencyKey: `${order.id}-attempt-1`,
        },
      });

      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return orderNumber;
    });

    return { ok: true, orderNumber };
  } catch (error) {
    if (error instanceof StockError) {
      return { ok: false, error: error.code, productId: error.productId };
    }
    if (error instanceof CheckoutError) {
      return { ok: false, error: error.code };
    }
    throw error;
  }
}

class StockError extends Error {
  constructor(public readonly productId: string, public readonly code: string) {
    super(code);
  }
}

class CheckoutError extends Error {
  constructor(public readonly code: string) {
    super(code);
  }
}
