import type { OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/admin/format";

/**
 * Statuses that count as realised revenue. An order only reaches PAID once an
 * admin (or, later, a real gateway) confirms the payment, so PENDING and
 * PAYMENT_PENDING are excluded — they are carts that may never be paid.
 * CANCELLED/REFUNDED/RETURNED are excluded because the money went back out.
 */
export const SALES_STATUSES: OrderStatus[] = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"];

/** Awaiting action from the shop: payment not yet confirmed. */
const PENDING_STATUSES: OrderStatus[] = ["PENDING", "PAYMENT_PENDING"];
/** Fulfilled and closed. */
const COMPLETED_STATUSES: OrderStatus[] = ["DELIVERED"];
/** Money returned or order voided. */
const CANCELLED_STATUSES: OrderStatus[] = ["CANCELLED", "REFUNDED", "RETURNED"];

export interface DashboardStockItem {
  id: string;
  label: string;
  sku: string;
  stockQuantity: number;
  lowStockThreshold: number;
  isVariant: boolean;
}

export interface DashboardData {
  totalSales: number;
  todaySales: number;
  monthSales: number;
  orderCounts: {
    total: number;
    pending: number;
    completed: number;
    cancelled: number;
  };
  totalCustomers: number;
  totalProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  stockAttention: DashboardStockItem[];
  bestSellers: { productId: string; nameEn: string; nameFa: string; quantity: number }[];
  recentOrders: {
    id: string;
    orderNumber: string;
    status: OrderStatus;
    grandTotal: number;
    createdAt: Date;
    customerName: string | null;
    guestEmail: string | null;
  }[];
  recentCustomers: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    createdAt: Date;
  }[];
  salesByDay: { date: Date; total: number }[];
}

function startOfToday(): Date {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfMonth(): Date {
  const date = new Date();
  date.setDate(1);
  date.setHours(0, 0, 0, 0);
  return date;
}

export async function getDashboardData(): Promise<DashboardData> {
  const todayStart = startOfToday();
  const monthStart = startOfMonth();
  const weekStart = new Date(todayStart.getTime() - 6 * 24 * 60 * 60 * 1000);

  const publishedProductScope = { deletedAt: null, status: "PUBLISHED" as const };

  const [
    totalSalesAgg,
    todaySalesAgg,
    monthSalesAgg,
    statusGroups,
    totalCustomers,
    totalProducts,
    // `prisma.product.fields.lowStockThreshold` compares two columns of the same
    // row, which is what "low stock" actually means — no threshold constant.
    lowStockProducts,
    outOfStockProducts,
    lowStockVariants,
    outOfStockVariants,
    bestSellerGroups,
    recentOrders,
    recentCustomers,
    weekOrders,
  ] = await Promise.all([
    prisma.order.aggregate({
      where: { status: { in: SALES_STATUSES } },
      _sum: { grandTotal: true },
    }),
    prisma.order.aggregate({
      where: { status: { in: SALES_STATUSES }, createdAt: { gte: todayStart } },
      _sum: { grandTotal: true },
    }),
    prisma.order.aggregate({
      where: { status: { in: SALES_STATUSES }, createdAt: { gte: monthStart } },
      _sum: { grandTotal: true },
    }),
    prisma.order.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.customer.count(),
    prisma.product.count({ where: publishedProductScope }),
    prisma.product.findMany({
      where: {
        ...publishedProductScope,
        hasVariants: false,
        stockQuantity: { gt: 0, lte: prisma.product.fields.lowStockThreshold },
      },
      select: { id: true, nameEn: true, nameFa: true, sku: true, stockQuantity: true, lowStockThreshold: true },
      orderBy: { stockQuantity: "asc" },
    }),
    prisma.product.count({
      where: { ...publishedProductScope, hasVariants: false, stockQuantity: 0 },
    }),
    prisma.productVariant.findMany({
      where: {
        isActive: true,
        product: publishedProductScope,
        stockQuantity: { gt: 0, lte: prisma.productVariant.fields.lowStockThreshold },
      },
      select: {
        id: true,
        nameEn: true,
        nameFa: true,
        sku: true,
        stockQuantity: true,
        lowStockThreshold: true,
      },
      orderBy: { stockQuantity: "asc" },
    }),
    prisma.productVariant.count({
      where: { isActive: true, product: publishedProductScope, stockQuantity: 0 },
    }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      where: { productId: { not: null }, order: { status: { in: SALES_STATUSES } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 5,
    }),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        grandTotal: true,
        createdAt: true,
        guestEmail: true,
        customer: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.customer.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, firstName: true, lastName: true, email: true, createdAt: true },
    }),
    prisma.order.findMany({
      where: { status: { in: SALES_STATUSES }, createdAt: { gte: weekStart } },
      select: { createdAt: true, grandTotal: true },
    }),
  ]);

  const countFor = (statuses: OrderStatus[]) =>
    statusGroups
      .filter((group) => statuses.includes(group.status))
      .reduce((sum, group) => sum + group._count._all, 0);

  const bestSellerIds = bestSellerGroups
    .map((group) => group.productId)
    .filter((id): id is string => id !== null);
  const bestSellerProducts = bestSellerIds.length
    ? await prisma.product.findMany({
        where: { id: { in: bestSellerIds } },
        select: { id: true, nameEn: true, nameFa: true },
      })
    : [];
  const bestSellerById = new Map(bestSellerProducts.map((product) => [product.id, product]));

  // Bucket the week's orders in JS: the row count is tiny and it avoids a raw
  // `date_trunc` query that would have to hand-bind the OrderStatus enum array.
  const salesByDay: { date: Date; total: number }[] = [];
  for (let offset = 6; offset >= 0; offset -= 1) {
    const day = new Date(todayStart.getTime() - offset * 24 * 60 * 60 * 1000);
    const next = new Date(day.getTime() + 24 * 60 * 60 * 1000);
    const total = weekOrders
      .filter((order) => order.createdAt >= day && order.createdAt < next)
      .reduce((sum, order) => sum + toNumber(order.grandTotal), 0);
    salesByDay.push({ date: day, total });
  }

  const stockAttention: DashboardStockItem[] = [
    ...lowStockProducts.map((product) => ({
      id: product.id,
      label: product.nameEn,
      sku: product.sku,
      stockQuantity: product.stockQuantity,
      lowStockThreshold: product.lowStockThreshold,
      isVariant: false,
    })),
    ...lowStockVariants.map((variant) => ({
      id: variant.id,
      label: variant.nameEn,
      sku: variant.sku,
      stockQuantity: variant.stockQuantity,
      lowStockThreshold: variant.lowStockThreshold,
      isVariant: true,
    })),
  ]
    .sort((a, b) => a.stockQuantity - b.stockQuantity)
    .slice(0, 8);

  return {
    totalSales: toNumber(totalSalesAgg._sum.grandTotal),
    todaySales: toNumber(todaySalesAgg._sum.grandTotal),
    monthSales: toNumber(monthSalesAgg._sum.grandTotal),
    orderCounts: {
      total: statusGroups.reduce((sum, group) => sum + group._count._all, 0),
      pending: countFor(PENDING_STATUSES),
      completed: countFor(COMPLETED_STATUSES),
      cancelled: countFor(CANCELLED_STATUSES),
    },
    totalCustomers,
    totalProducts,
    lowStockCount: lowStockProducts.length + lowStockVariants.length,
    outOfStockCount: outOfStockProducts + outOfStockVariants,
    stockAttention,
    bestSellers: bestSellerGroups.map((group) => ({
      productId: group.productId as string,
      nameEn: bestSellerById.get(group.productId as string)?.nameEn ?? "—",
      nameFa: bestSellerById.get(group.productId as string)?.nameFa ?? "—",
      quantity: group._sum.quantity ?? 0,
    })),
    recentOrders: recentOrders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      grandTotal: toNumber(order.grandTotal),
      createdAt: order.createdAt,
      customerName: order.customer
        ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
        : null,
      guestEmail: order.guestEmail,
    })),
    recentCustomers,
    salesByDay,
  };
}
