import type { OrderStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/admin/format";

export const ORDERS_PAGE_SIZE = 20;

export type OrderSort = "newest" | "oldest" | "totalDesc" | "totalAsc";

export interface AdminOrderFilters {
  search?: string;
  status?: OrderStatus;
  from?: string;
  to?: string;
  sort: OrderSort;
  page: number;
}

export interface AdminOrderRow {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  grandTotal: number;
  createdAt: Date;
  itemCount: number;
  customerName: string | null;
  customerEmail: string | null;
  guestEmail: string | null;
  paymentStatus: string | null;
}

const ORDER_BY: Record<OrderSort, Prisma.OrderOrderByWithRelationInput> = {
  newest: { createdAt: "desc" },
  oldest: { createdAt: "asc" },
  totalDesc: { grandTotal: "desc" },
  totalAsc: { grandTotal: "asc" },
};

export async function listAdminOrders(filters: AdminOrderFilters) {
  const where: Prisma.OrderWhereInput = {};

  if (filters.search) {
    where.OR = [
      { orderNumber: { contains: filters.search, mode: "insensitive" } },
      { guestEmail: { contains: filters.search, mode: "insensitive" } },
      { guestPhone: { contains: filters.search } },
      { customer: { email: { contains: filters.search, mode: "insensitive" } } },
      { customer: { firstName: { contains: filters.search, mode: "insensitive" } } },
      { customer: { lastName: { contains: filters.search, mode: "insensitive" } } },
    ];
  }
  if (filters.status) where.status = filters.status;

  if (filters.from || filters.to) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (filters.from) {
      const from = new Date(filters.from);
      if (!Number.isNaN(from.getTime())) createdAt.gte = from;
    }
    if (filters.to) {
      const to = new Date(filters.to);
      // The date input gives a day; include the whole of it.
      if (!Number.isNaN(to.getTime())) {
        to.setHours(23, 59, 59, 999);
        createdAt.lte = to;
      }
    }
    if (createdAt.gte || createdAt.lte) where.createdAt = createdAt;
  }

  const page = Math.max(1, filters.page);

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: ORDER_BY[filters.sort],
      skip: (page - 1) * ORDERS_PAGE_SIZE,
      take: ORDERS_PAGE_SIZE,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        grandTotal: true,
        createdAt: true,
        guestEmail: true,
        customer: { select: { firstName: true, lastName: true, email: true } },
        _count: { select: { items: true } },
        payments: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } },
      },
    }),
  ]);

  const rows: AdminOrderRow[] = orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    grandTotal: toNumber(order.grandTotal),
    createdAt: order.createdAt,
    itemCount: order._count.items,
    customerName: order.customer
      ? `${order.customer.firstName} ${order.customer.lastName}`.trim()
      : null,
    customerEmail: order.customer?.email ?? null,
    guestEmail: order.guestEmail,
    paymentStatus: order.payments[0]?.status ?? null,
  }));

  return {
    rows,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / ORDERS_PAGE_SIZE)),
  };
}

export interface ShippingAddressShape {
  firstName?: string;
  lastName?: string;
  phone?: string;
  addressLine?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  country?: string;
}

export function parseAddress(value: Prisma.JsonValue | null): ShippingAddressShape {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  const read = (key: string) => (typeof record[key] === "string" ? (record[key] as string) : undefined);
  return {
    firstName: read("firstName"),
    lastName: read("lastName"),
    phone: read("phone"),
    addressLine: read("addressLine"),
    city: read("city"),
    province: read("province"),
    postalCode: read("postalCode"),
    country: read("country"),
  };
}

export async function getAdminOrder(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          // Only used to link back to the catalogue; the order line keeps its
          // own denormalised name/sku so historical invoices never change.
          product: { select: { id: true } },
          inventoryTransactions: { select: { type: true } },
        },
      },
      statusHistory: {
        orderBy: { createdAt: "asc" },
        include: { changedByAdmin: { select: { name: true } } },
      },
      payments: { orderBy: { createdAt: "desc" } },
      coupon: { select: { code: true } },
      customer: {
        select: { id: true, firstName: true, lastName: true, email: true, phone: true },
      },
    },
  });
  if (!order) return null;

  return {
    ...order,
    subtotal: toNumber(order.subtotal),
    discountTotal: toNumber(order.discountTotal),
    shippingTotal: toNumber(order.shippingTotal),
    taxTotal: toNumber(order.taxTotal),
    grandTotal: toNumber(order.grandTotal),
    shipping: parseAddress(order.shippingAddress),
    items: order.items.map((item) => ({
      ...item,
      unitPrice: toNumber(item.unitPrice),
      lineTotal: toNumber(item.lineTotal),
      hasCancellationTransaction: item.inventoryTransactions.some(
        (transaction) => transaction.type === "CANCELLATION"
      ),
    })),
    payments: order.payments.map((payment) => ({
      ...payment,
      amount: toNumber(payment.amount),
    })),
  };
}

export type AdminOrderDetail = NonNullable<Awaited<ReturnType<typeof getAdminOrder>>>;
