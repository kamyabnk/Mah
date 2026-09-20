"use server";

import { prisma } from "@/lib/prisma";
import { runAdminAction, type AdminActionResult } from "@/lib/admin/action-result";

/**
 * Viewing customers needs `customers.view`; changing one needs the stronger
 * `customers.manage`, which is why this action does not reuse the read
 * permission. Disabling an account blocks future sign-ins (the customer
 * authorize step rejects `isActive: false`) without deleting order history.
 */
export async function setCustomerActive(
  customerId: string,
  isActive: boolean
): Promise<AdminActionResult<undefined>> {
  return runAdminAction("customers.manage", async () => {
    await prisma.customer.update({ where: { id: customerId }, data: { isActive } });
    return undefined;
  });
}
