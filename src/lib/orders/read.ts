import { prisma } from "@/lib/prisma";
import { customerAuth } from "@/lib/auth/customer-auth";

export async function getOrderByNumber(orderNumber: string, customerId: string | null) {
  return prisma.order.findFirst({
    where: { orderNumber, ...(customerId ? { customerId } : {}) },
    include: {
      items: true,
      payments: true,
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });
}

export async function getCurrentCustomerOrders() {
  const session = await customerAuth();
  const customerId = (session?.user as { id?: string } | undefined)?.id;
  if (!customerId) return [];

  return prisma.order.findMany({
    where: { customerId },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });
}
