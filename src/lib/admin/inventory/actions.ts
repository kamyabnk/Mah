"use server";

import { prisma } from "@/lib/prisma";
import {
  AdminActionError,
  toFieldErrors,
  tryGuardAdminAction,
  type AdminFormState,
} from "@/lib/admin/action-result";
import { revalidateStorefront } from "@/lib/admin/revalidate";
import { readInt, readRequiredString, readString } from "@/lib/admin/form-data";
import { syncProductStockFromVariants } from "@/lib/admin/products/stock-sync";
import { z } from "zod";

const PERMISSION = "inventory.manage";

const adjustmentSchema = z.object({
  kind: z.enum(["product", "variant"]),
  id: z.string().min(1, "required"),
  quantityChange: z.number().int("invalidNumber"),
  note: z.string().min(1, "required"),
});

/**
 * Manual stock correction. Writes the new quantity AND an auditable
 * `InventoryTransaction` row in one database transaction, so stock can never
 * move without a record of who moved it and why — `note` is mandatory for
 * exactly that reason.
 */
export async function adjustStock(
  _prevState: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  const adminId = await tryGuardAdminAction(PERMISSION);
  if (!adminId) return { error: "unauthorized" };

  const parsed = adjustmentSchema.safeParse({
    kind: readRequiredString(formData, "kind"),
    id: readRequiredString(formData, "id"),
    quantityChange: readInt(formData, "quantityChange", 0),
    note: readString(formData, "note") ?? "",
  });
  if (!parsed.success) {
    return { error: "invalidForm", fieldErrors: toFieldErrors(parsed.error) };
  }

  const { kind, id, quantityChange, note } = parsed.data;
  if (quantityChange === 0) {
    return { error: "zeroChange", fieldErrors: { quantityChange: "zeroChange" } };
  }

  try {
    await prisma.$transaction(async (tx) => {
      if (kind === "variant") {
        const variant = await tx.productVariant.findUnique({
          where: { id },
          select: { id: true, productId: true, stockQuantity: true },
        });
        if (!variant) throw new AdminActionError("notFound");

        const resulting = variant.stockQuantity + quantityChange;
        if (resulting < 0) throw new AdminActionError("wouldGoNegative");

        // Conditional update, same compare-and-swap style as the checkout path:
        // the row only moves if it still holds the quantity we just read, so a
        // concurrent sale can't be silently overwritten.
        const updated = await tx.productVariant.updateMany({
          where: { id, stockQuantity: variant.stockQuantity },
          data: { stockQuantity: resulting },
        });
        if (updated.count === 0) throw new AdminActionError("notFound");

        await tx.inventoryTransaction.create({
          data: {
            productId: variant.productId,
            variantId: variant.id,
            type: "MANUAL_ADJUSTMENT",
            quantityChange,
            resultingQuantity: resulting,
            note,
            createdByAdminId: adminId,
          },
        });

        // Variant stock changed, so the product's display aggregate must follow.
        await syncProductStockFromVariants(variant.productId, tx);
      } else {
        const product = await tx.product.findFirst({
          where: { id, deletedAt: null },
          select: { id: true, stockQuantity: true, hasVariants: true },
        });
        if (!product) throw new AdminActionError("notFound");
        // A variant product's column is a derived aggregate — adjust the variant.
        if (product.hasVariants) throw new AdminActionError("notFound");

        const resulting = product.stockQuantity + quantityChange;
        if (resulting < 0) throw new AdminActionError("wouldGoNegative");

        const updated = await tx.product.updateMany({
          where: { id, stockQuantity: product.stockQuantity },
          data: { stockQuantity: resulting },
        });
        if (updated.count === 0) throw new AdminActionError("notFound");

        await tx.inventoryTransaction.create({
          data: {
            productId: product.id,
            type: "MANUAL_ADJUSTMENT",
            quantityChange,
            resultingQuantity: resulting,
            note,
            createdByAdminId: adminId,
          },
        });
      }
    });
  } catch (error) {
    if (error instanceof AdminActionError) return { error: error.code };
    throw error;
  }

  revalidateStorefront();
  return { success: "adjusted" };
}
