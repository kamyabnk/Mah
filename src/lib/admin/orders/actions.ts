"use server";

import type { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  AdminActionError,
  runAdminAction,
  type AdminActionResult,
} from "@/lib/admin/action-result";
import { revalidateStorefront } from "@/lib/admin/revalidate";
import { syncProductStockFromVariants } from "@/lib/admin/products/stock-sync";

const PERMISSION = "orders.manage";

const ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "PAYMENT_PENDING",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "DELIVERED",
  "CANCELLED",
  "REFUNDED",
  "RETURNED",
];

/**
 * Statuses a cancellation can restore stock from. Once an order has SHIPPED the
 * goods have physically left, so cancelling it is a bookkeeping correction —
 * the stock comes back through a RETURN, recorded separately, not here.
 */
const RESTOCKABLE_ON_CANCEL: OrderStatus[] = ["PENDING", "PAYMENT_PENDING", "PAID", "PROCESSING"];

/** Provider key of `ManualPaymentProvider`, which never auto-succeeds by design. */
const MANUAL_PROVIDER_KEY = "manual";

/**
 * Puts the reserved stock of one order item back, exactly once.
 *
 * `InventoryTransaction` has `@@unique([orderItemId, type])`, so at most one
 * CANCELLATION can ever exist per item. The pre-check keeps a second
 * cancel-click from double-restoring; the constraint is the real guarantee,
 * since a racing insert fails and rolls the whole transaction back rather than
 * leaving stock inflated.
 */
async function restoreStockForOrderItem(
  tx: Prisma.TransactionClient,
  item: { id: string; productId: string | null; variantId: string | null; quantity: number },
  orderNumber: string,
  adminId: string
): Promise<boolean> {
  // The product may have been hard-deleted from a historical order line.
  if (!item.productId) return false;

  const alreadyRestored = await tx.inventoryTransaction.findFirst({
    where: { orderItemId: item.id, type: "CANCELLATION" },
    select: { id: true },
  });
  if (alreadyRestored) return false;

  if (item.variantId) {
    const variant = await tx.productVariant.update({
      where: { id: item.variantId },
      data: { stockQuantity: { increment: item.quantity } },
      select: { stockQuantity: true, productId: true },
    });
    await tx.inventoryTransaction.create({
      data: {
        productId: item.productId,
        variantId: item.variantId,
        type: "CANCELLATION",
        quantityChange: item.quantity,
        resultingQuantity: variant.stockQuantity,
        orderItemId: item.id,
        note: `Cancelled order ${orderNumber}`,
        createdByAdminId: adminId,
      },
    });
    await syncProductStockFromVariants(variant.productId, tx);
    return true;
  } else {
    const product = await tx.product.update({
      where: { id: item.productId },
      data: { stockQuantity: { increment: item.quantity } },
      select: { stockQuantity: true },
    });
    await tx.inventoryTransaction.create({
      data: {
        productId: item.productId,
        type: "CANCELLATION",
        quantityChange: item.quantity,
        resultingQuantity: product.stockQuantity,
        orderItemId: item.id,
        note: `Cancelled order ${orderNumber}`,
        createdByAdminId: adminId,
      },
    });
    return true;
  }
}

export async function changeOrderStatus(
  orderId: string,
  nextStatus: string,
  note: string | null
): Promise<AdminActionResult<{ restoredStock: boolean }>> {
  const result = await runAdminAction(PERMISSION, async (adminId) => {
    if (!ORDER_STATUSES.includes(nextStatus as OrderStatus)) {
      throw new AdminActionError("invalidStatus");
    }
    const status = nextStatus as OrderStatus;

    return prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          items: { select: { id: true, productId: true, variantId: true, quantity: true } },
        },
      });
      if (!order) throw new AdminActionError("notFound");
      if (order.status === status) throw new AdminActionError("sameStatus");

      const shouldAttemptRestore =
        status === "CANCELLED" && RESTOCKABLE_ON_CANCEL.includes(order.status);

      await tx.order.update({ where: { id: orderId }, data: { status } });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status,
          note: note?.trim() || null,
          changedByAdminId: adminId,
        },
      });

      // Reports what actually moved, not what was attempted: re-cancelling an
      // order whose items were already restored must not claim otherwise.
      let restoredStock = false;
      if (shouldAttemptRestore) {
        for (const item of order.items) {
          const restored = await restoreStockForOrderItem(tx, item, order.orderNumber, adminId);
          restoredStock = restoredStock || restored;
        }
      }

      return { restoredStock };
    });
  });

  if (result.ok) revalidateStorefront();
  return result;
}

/**
 * Confirms a manual (bank-transfer) payment. `ManualPaymentProvider` has no
 * callback flow by design, so an admin confirming receipt is the intended real
 * flow, not a workaround.
 */
export async function markOrderPaid(orderId: string): Promise<AdminActionResult<undefined>> {
  const result = await runAdminAction(PERMISSION, async (adminId) => {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: {
          id: true,
          status: true,
          payments: {
            where: { status: "PENDING", provider: MANUAL_PROVIDER_KEY },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: { id: true },
          },
        },
      });
      if (!order) throw new AdminActionError("notFound");

      const payment = order.payments[0];
      if (!payment) throw new AdminActionError("noPendingPayment");

      await tx.payment.update({ where: { id: payment.id }, data: { status: "SUCCEEDED" } });

      // Only move the order forward if it is still waiting on payment; an order
      // already being picked or shipped keeps the status it has.
      if (order.status === "PENDING" || order.status === "PAYMENT_PENDING") {
        await tx.order.update({ where: { id: orderId }, data: { status: "PAID" } });
        await tx.orderStatusHistory.create({
          data: {
            orderId,
            status: "PAID",
            note: "Manual payment confirmed by admin",
            changedByAdminId: adminId,
          },
        });
      }
    });
    return undefined;
  });

  if (result.ok) revalidateStorefront();
  return result;
}

export async function saveOrderInternalNote(
  orderId: string,
  note: string
): Promise<AdminActionResult<undefined>> {
  return runAdminAction(PERMISSION, async () => {
    await prisma.order.update({
      where: { id: orderId },
      data: { internalNote: note.trim() || null },
    });
    return undefined;
  });
}
