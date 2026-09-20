"use server";

import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  AdminActionError,
  runAdminAction,
  toFieldErrors,
  tryGuardAdminAction,
  type AdminActionResult,
  type AdminFormState,
} from "@/lib/admin/action-result";
import { revalidateStorefront } from "@/lib/admin/revalidate";
import {
  readBoolean,
  readInt,
  readNumber,
  readRequiredString,
  readString,
} from "@/lib/admin/form-data";
import { syncProductStockFromVariants } from "./stock-sync";

const PERMISSION = "products.manage";

const variantSchema = z.object({
  sku: z.string().min(1, "required"),
  nameEn: z.string().min(1, "required"),
  nameFa: z.string().min(1, "required"),
  price: z.number("invalidNumber").int("invalidNumber").min(0, "mustBePositive").nullable(),
  salePrice: z.number("invalidNumber").int("invalidNumber").min(0, "mustBePositive").nullable(),
  stockQuantity: z.number().int().min(0, "mustBePositive"),
  lowStockThreshold: z.number().int().min(0, "mustBePositive"),
});

export async function saveProductVariant(
  _prevState: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  const adminId = await tryGuardAdminAction(PERMISSION);
  if (!adminId) return { error: "unauthorized" };

  const productId = readString(formData, "productId");
  if (!productId) return { error: "notFound" };

  const parsed = variantSchema.safeParse({
    sku: readRequiredString(formData, "sku"),
    nameEn: readRequiredString(formData, "nameEn"),
    nameFa: readRequiredString(formData, "nameFa"),
    price: readNumber(formData, "price"),
    salePrice: readNumber(formData, "salePrice"),
    stockQuantity: readInt(formData, "stockQuantity", 0),
    lowStockThreshold: readInt(formData, "lowStockThreshold", 5),
  });
  if (!parsed.success) {
    return { error: "invalidForm", fieldErrors: toFieldErrors(parsed.error) };
  }

  const variantId = readString(formData, "variantId");
  const data = {
    ...parsed.data,
    size: readString(formData, "size"),
    color: readString(formData, "color"),
    fragrance: readString(formData, "fragrance"),
    weight: readNumber(formData, "weight"),
    isActive: readBoolean(formData, "isActive"),
  };

  try {
    if (variantId) {
      const existing = await prisma.productVariant.findFirst({
        where: { id: variantId, productId },
        select: { id: true },
      });
      if (!existing) return { error: "notFound" };
      await prisma.productVariant.update({ where: { id: variantId }, data });
    } else {
      await prisma.productVariant.create({ data: { ...data, productId } });
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "skuTaken", fieldErrors: { sku: "skuTaken" } };
    }
    throw error;
  }

  // Keep Product.stockQuantity equal to SUM(variant stock) — the storefront's
  // "in stock" badges read that column for variant products too.
  await syncProductStockFromVariants(productId);
  revalidateStorefront();
  return { success: "saved" };
}

export async function deleteProductVariant(
  variantId: string
): Promise<AdminActionResult<undefined>> {
  const result = await runAdminAction(PERMISSION, async () => {
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      select: { id: true, productId: true, _count: { select: { orderItems: true } } },
    });
    if (!variant) throw new AdminActionError("notFound");

    if (variant._count.orderItems > 0) {
      // Historical order lines point at this variant; deactivate instead of
      // deleting so past invoices keep their variant label and stock history.
      await prisma.productVariant.update({
        where: { id: variantId },
        data: { isActive: false, stockQuantity: 0 },
      });
    } else {
      await prisma.productVariant.delete({ where: { id: variantId } });
    }

    await syncProductStockFromVariants(variant.productId);
    return undefined;
  });

  if (result.ok) revalidateStorefront();
  return result;
}
