import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { toNumber } from "@/lib/admin/format";
import { SALES_STATUSES } from "@/lib/admin/dashboard/queries";

export const CUSTOMERS_PAGE_SIZE = 25;

export interface AdminCustomerRow {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  orderCount: number;
  totalSpend: number;
}

export async function listAdminCustomers(search: string | undefined, page: number) {
  const where: Prisma.CustomerWhereInput = {};
  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
    ];
  }

  const safePage = Math.max(1, page);

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (safePage - 1) * CUSTOMERS_PAGE_SIZE,
      take: CUSTOMERS_PAGE_SIZE,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        isActive: true,
        createdAt: true,
        _count: { select: { orders: true } },
      },
    }),
  ]);

  // Spend is summed only over statuses that represent realised revenue, the
  // same definition the dashboard uses, so the two views never disagree.
  const spendByCustomer = new Map<string, number>();
  if (customers.length > 0) {
    const grouped = await prisma.order.groupBy({
      by: ["customerId"],
      where: {
        customerId: { in: customers.map((customer) => customer.id) },
        status: { in: SALES_STATUSES },
      },
      _sum: { grandTotal: true },
    });
    for (const row of grouped) {
      if (row.customerId) spendByCustomer.set(row.customerId, toNumber(row._sum.grandTotal));
    }
  }

  const rows: AdminCustomerRow[] = customers.map((customer) => ({
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phone: customer.phone,
    isActive: customer.isActive,
    createdAt: customer.createdAt,
    orderCount: customer._count.orders,
    totalSpend: spendByCustomer.get(customer.id) ?? 0,
  }));

  return {
    rows,
    total,
    page: safePage,
    pageCount: Math.max(1, Math.ceil(total / CUSTOMERS_PAGE_SIZE)),
  };
}

export async function getAdminCustomer(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] },
      orders: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          orderNumber: true,
          status: true,
          grandTotal: true,
          createdAt: true,
          _count: { select: { items: true } },
        },
      },
      wishlistItems: {
        orderBy: { createdAt: "desc" },
        select: {
          productId: true,
          product: { select: { id: true, nameEn: true, nameFa: true, sku: true } },
        },
      },
    },
  });
  if (!customer) return null;

  const totalSpend = customer.orders
    .filter((order) => SALES_STATUSES.includes(order.status))
    .reduce((sum, order) => sum + toNumber(order.grandTotal), 0);

  return {
    ...customer,
    totalSpend,
    orders: customer.orders.map((order) => ({
      ...order,
      grandTotal: toNumber(order.grandTotal),
    })),
  };
}

export type AdminCustomerDetail = NonNullable<Awaited<ReturnType<typeof getAdminCustomer>>>;
