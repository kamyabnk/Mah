"use server";

import { Prisma, type ProductStatus } from "@prisma/client";
import { redirect } from "next/navigation";
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
  normaliseSlug,
  readBoolean,
  readInt,
  readNumber,
  readRequiredString,
  readString,
  readStringList,
} from "@/lib/admin/form-data";
import { syncProductStockFromVariants } from "./stock-sync";

const PERMISSION = "products.manage";

const slugPattern = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;

const productSchema = z.object({
  nameEn: z.string().min(1, "required"),
  nameFa: z.string().min(1, "required"),
  slugEn: z.string().min(1, "required").regex(slugPattern, "invalidSlug"),
  slugFa: z.string().min(1, "required").regex(slugPattern, "invalidSlug"),
  sku: z.string().min(1, "required"),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]),
  price: z.number("invalidNumber").int("invalidNumber").min(0, "mustBePositive"),
  salePrice: z.number("invalidNumber").int("invalidNumber").min(0, "mustBePositive").nullable(),
  costPrice: z.number("invalidNumber").int("invalidNumber").min(0, "mustBePositive").nullable(),
  stockQuantity: z.number().int().min(0, "mustBePositive"),
  lowStockThreshold: z.number().int().min(0, "mustBePositive"),
  weight: z.number("invalidNumber").min(0, "mustBePositive").nullable(),
  burnTimeMinutes: z.number("invalidNumber").int("invalidNumber").min(0, "mustBePositive").nullable(),
});

function parseProductForm(formData: FormData) {
  return productSchema.safeParse({
    nameEn: readRequiredString(formData, "nameEn"),
    nameFa: readRequiredString(formData, "nameFa"),
    slugEn: normaliseSlug(readRequiredString(formData, "slugEn")),
    slugFa: normaliseSlug(readRequiredString(formData, "slugFa")),
    sku: readRequiredString(formData, "sku"),
    status: readRequiredString(formData, "status") || "DRAFT",
    price: readNumber(formData, "price") ?? Number.NaN,
    salePrice: readNumber(formData, "salePrice"),
    costPrice: readNumber(formData, "costPrice"),
    stockQuantity: readInt(formData, "stockQuantity", 0),
    lowStockThreshold: readInt(formData, "lowStockThreshold", 5),
    weight: readNumber(formData, "weight"),
    burnTimeMinutes: readNumber(formData, "burnTimeMinutes"),
  });
}

/** `{ length, width, height }` in cm, or `null` when every box is blank. */
function readDimensions(formData: FormData): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  const length = readNumber(formData, "dimensionLength");
  const width = readNumber(formData, "dimensionWidth");
  const height = readNumber(formData, "dimensionHeight");
  if (length === null && width === null && height === null) return Prisma.JsonNull;
  return { length, width, height };
}

/** Maps a unique-constraint violation onto the field the admin can actually fix. */
function uniqueViolationState(error: unknown): AdminFormState | null {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") return null;
  const target = error.meta?.target;
  const fields = Array.isArray(target) ? target.map(String) : [String(target ?? "")];
  if (fields.some((field) => field.includes("sku"))) {
    return { fieldErrors: { sku: "skuTaken" }, error: "skuTaken" };
  }
  if (fields.some((field) => field.includes("slugEn"))) {
    return { fieldErrors: { slugEn: "slugTaken" }, error: "slugTaken" };
  }
  if (fields.some((field) => field.includes("slugFa"))) {
    return { fieldErrors: { slugFa: "slugTaken" }, error: "slugTaken" };
  }
  return { error: "slugTaken" };
}

export async function saveProduct(
  _prevState: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  // Permission first, before the payload is even looked at.
  const adminId = await tryGuardAdminAction(PERMISSION);
  if (!adminId) return { error: "unauthorized" };

  const parsed = parseProductForm(formData);
  if (!parsed.success) {
    return { error: "invalidForm", fieldErrors: toFieldErrors(parsed.error) };
  }

  const productId = readString(formData, "id");
  const locale = readRequiredString(formData, "locale") === "fa" ? "fa" : "en";
  const values = parsed.data;
  const hasVariants = readBoolean(formData, "hasVariants");
  const categoryIds = readStringList(formData, "categoryIds");
  const tagIds = readStringList(formData, "tagIds");

  const data = {
    nameEn: values.nameEn,
    nameFa: values.nameFa,
    slugEn: values.slugEn,
    slugFa: values.slugFa,
    sku: values.sku,
    status: values.status as ProductStatus,
    hasVariants,
    price: values.price,
    salePrice: values.salePrice,
    costPrice: values.costPrice,
    lowStockThreshold: values.lowStockThreshold,
    weight: values.weight,
    dimensions: readDimensions(formData),
    waxType: readString(formData, "waxType"),
    wickType: readString(formData, "wickType"),
    burnTimeMinutes: values.burnTimeMinutes,
    fragranceFamilyId: readString(formData, "fragranceFamilyId"),
    fragranceNotesEn: readString(formData, "fragranceNotesEn"),
    fragranceNotesFa: readString(formData, "fragranceNotesFa"),
    color: readString(formData, "color"),
    size: readString(formData, "size"),
    shortDescriptionEn: readString(formData, "shortDescriptionEn"),
    shortDescriptionFa: readString(formData, "shortDescriptionFa"),
    descriptionEn: readString(formData, "descriptionEn"),
    descriptionFa: readString(formData, "descriptionFa"),
    ingredientsEn: readString(formData, "ingredientsEn"),
    ingredientsFa: readString(formData, "ingredientsFa"),
    careInstructionsEn: readString(formData, "careInstructionsEn"),
    careInstructionsFa: readString(formData, "careInstructionsFa"),
    safetyInstructionsEn: readString(formData, "safetyInstructionsEn"),
    safetyInstructionsFa: readString(formData, "safetyInstructionsFa"),
    seoTitleEn: readString(formData, "seoTitleEn"),
    seoTitleFa: readString(formData, "seoTitleFa"),
    seoDescriptionEn: readString(formData, "seoDescriptionEn"),
    seoDescriptionFa: readString(formData, "seoDescriptionFa"),
    seoKeywordsEn: readString(formData, "seoKeywordsEn"),
    seoKeywordsFa: readString(formData, "seoKeywordsFa"),
    isFeatured: readBoolean(formData, "isFeatured"),
    isBestSeller: readBoolean(formData, "isBestSeller"),
    isNewArrival: readBoolean(formData, "isNewArrival"),
    updatedByAdminId: adminId,
  };

  let createdId: string | null = null;

  try {
    if (productId) {
      const existing = await prisma.product.findFirst({
        where: { id: productId, deletedAt: null },
        select: { id: true, publishedAt: true },
      });
      if (!existing) return { error: "notFound" };

      await prisma.$transaction(async (tx) => {
        await tx.product.update({
          where: { id: productId },
          data: {
            ...data,
            // Stamp the first publish only; re-publishing keeps the original date.
            publishedAt:
              values.status === "PUBLISHED" && existing.publishedAt === null
                ? new Date()
                : existing.publishedAt,
            // For variant products the column is a synced aggregate, so the
            // form's value is ignored and recomputed below.
            ...(hasVariants ? {} : { stockQuantity: values.stockQuantity }),
          },
        });
        await tx.productCategory.deleteMany({ where: { productId } });
        if (categoryIds.length) {
          await tx.productCategory.createMany({
            data: categoryIds.map((categoryId) => ({ productId, categoryId })),
            skipDuplicates: true,
          });
        }
        await tx.productTag.deleteMany({ where: { productId } });
        if (tagIds.length) {
          await tx.productTag.createMany({
            data: tagIds.map((tagId) => ({ productId, tagId })),
            skipDuplicates: true,
          });
        }
        await syncProductStockFromVariants(productId, tx);
      });
    } else {
      const created = await prisma.$transaction(async (tx) => {
        const product = await tx.product.create({
          data: {
            ...data,
            stockQuantity: hasVariants ? 0 : values.stockQuantity,
            publishedAt: values.status === "PUBLISHED" ? new Date() : null,
            categories: categoryIds.length
              ? { create: categoryIds.map((categoryId) => ({ categoryId })) }
              : undefined,
            tags: tagIds.length ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
          },
          select: { id: true },
        });
        return product;
      });
      createdId = created.id;
    }
  } catch (error) {
    const conflict = uniqueViolationState(error);
    if (conflict) return conflict;
    throw error;
  }

  revalidateStorefront();

  // Outside the try/catch: `redirect()` signals by throwing. A new product goes
  // straight to its edit page, which is where images and variants live.
  if (createdId) {
    redirect(`/${locale}/admin/products/${createdId}`);
  }

  return { success: "saved" };
}

export async function deleteProduct(productId: string): Promise<AdminActionResult<undefined>> {
  const result = await runAdminAction(PERMISSION, async () => {
    // Soft delete: OrderItem keeps a nullable FK to Product for historical
    // orders, so hard-deleting would erase the product name from past invoices.
    await prisma.product.updateMany({
      where: { id: productId, deletedAt: null },
      data: { deletedAt: new Date(), status: "ARCHIVED" },
    });
    return undefined;
  });
  if (result.ok) revalidateStorefront();
  return result;
}

export async function duplicateProduct(
  productId: string
): Promise<AdminActionResult<{ id: string }>> {
  const result = await runAdminAction(PERMISSION, async (adminId) => {
    const source = await prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
      include: {
        images: { orderBy: { sortOrder: "asc" } },
        variants: true,
        categories: true,
        tags: true,
      },
    });
    if (!source) throw new AdminActionError("notFound");

    // A short random suffix keeps the unique slug/SKU columns satisfied without
    // a retry loop.
    const suffix = Math.random().toString(36).slice(2, 7);

    const copy = await prisma.product.create({
      data: {
        nameEn: `${source.nameEn} (copy)`,
        nameFa: `${source.nameFa} (کپی)`,
        slugEn: `${source.slugEn}-${suffix}`,
        slugFa: `${source.slugFa}-${suffix}`,
        sku: `${source.sku}-${suffix.toUpperCase()}`,
        // A duplicate always starts unpublished so a half-edited copy can never
        // appear on the storefront.
        status: "DRAFT",
        publishedAt: null,
        hasVariants: source.hasVariants,
        price: source.price,
        salePrice: source.salePrice,
        costPrice: source.costPrice,
        stockQuantity: source.hasVariants ? 0 : source.stockQuantity,
        lowStockThreshold: source.lowStockThreshold,
        weight: source.weight,
        dimensions: source.dimensions ?? Prisma.JsonNull,
        waxType: source.waxType,
        wickType: source.wickType,
        burnTimeMinutes: source.burnTimeMinutes,
        fragranceFamilyId: source.fragranceFamilyId,
        fragranceNotesEn: source.fragranceNotesEn,
        fragranceNotesFa: source.fragranceNotesFa,
        color: source.color,
        size: source.size,
        shortDescriptionEn: source.shortDescriptionEn,
        shortDescriptionFa: source.shortDescriptionFa,
        descriptionEn: source.descriptionEn,
        descriptionFa: source.descriptionFa,
        ingredientsEn: source.ingredientsEn,
        ingredientsFa: source.ingredientsFa,
        careInstructionsEn: source.careInstructionsEn,
        careInstructionsFa: source.careInstructionsFa,
        safetyInstructionsEn: source.safetyInstructionsEn,
        safetyInstructionsFa: source.safetyInstructionsFa,
        seoTitleEn: source.seoTitleEn,
        seoTitleFa: source.seoTitleFa,
        seoDescriptionEn: source.seoDescriptionEn,
        seoDescriptionFa: source.seoDescriptionFa,
        seoKeywordsEn: source.seoKeywordsEn,
        seoKeywordsFa: source.seoKeywordsFa,
        isFeatured: source.isFeatured,
        isBestSeller: source.isBestSeller,
        isNewArrival: source.isNewArrival,
        updatedByAdminId: adminId,
        categories: { create: source.categories.map((row) => ({ categoryId: row.categoryId })) },
        tags: { create: source.tags.map((row) => ({ tagId: row.tagId })) },
        images: {
          create: source.images.map((image) => ({
            // The same stored file is referenced by both products; deleting an
            // image row never deletes the file for exactly this reason.
            url: image.url,
            altEn: image.altEn,
            altFa: image.altFa,
            sortOrder: image.sortOrder,
            isPrimary: image.isPrimary,
          })),
        },
        variants: {
          create: source.variants.map((variant) => ({
            sku: `${variant.sku}-${suffix.toUpperCase()}`,
            nameEn: variant.nameEn,
            nameFa: variant.nameFa,
            size: variant.size,
            color: variant.color,
            fragrance: variant.fragrance,
            price: variant.price,
            salePrice: variant.salePrice,
            stockQuantity: variant.stockQuantity,
            lowStockThreshold: variant.lowStockThreshold,
            weight: variant.weight,
            isActive: variant.isActive,
          })),
        },
      },
      select: { id: true },
    });

    await syncProductStockFromVariants(copy.id);
    return { id: copy.id };
  });

  if (result.ok) revalidateStorefront();
  return result;
}

export type BulkProductAction = "publish" | "unpublish" | "archive" | "delete" | "assignCategory";

export async function bulkProductAction(
  productIds: string[],
  action: BulkProductAction,
  categoryId?: string
): Promise<AdminActionResult<{ count: number }>> {
  const result = await runAdminAction(PERMISSION, async (adminId) => {
    const ids = productIds.filter((id) => typeof id === "string" && id.length > 0);
    if (ids.length === 0) return { count: 0 };

    const scope = { id: { in: ids }, deletedAt: null };

    switch (action) {
      case "publish": {
        const updated = await prisma.product.updateMany({
          where: scope,
          data: { status: "PUBLISHED", updatedByAdminId: adminId },
        });
        // `updateMany` cannot set a per-row value, so stamp publishedAt for the
        // products that have never been published in a second pass.
        await prisma.product.updateMany({
          where: { ...scope, publishedAt: null },
          data: { publishedAt: new Date() },
        });
        return { count: updated.count };
      }
      case "unpublish": {
        const updated = await prisma.product.updateMany({
          where: scope,
          data: { status: "DRAFT", updatedByAdminId: adminId },
        });
        return { count: updated.count };
      }
      case "archive": {
        const updated = await prisma.product.updateMany({
          where: scope,
          data: { status: "ARCHIVED", updatedByAdminId: adminId },
        });
        return { count: updated.count };
      }
      case "delete": {
        const updated = await prisma.product.updateMany({
          where: scope,
          data: { deletedAt: new Date(), status: "ARCHIVED", updatedByAdminId: adminId },
        });
        return { count: updated.count };
      }
      case "assignCategory": {
        if (!categoryId) throw new AdminActionError("invalidForm");
        const existing = await prisma.product.findMany({ where: scope, select: { id: true } });
        await prisma.productCategory.createMany({
          data: existing.map((product) => ({ productId: product.id, categoryId })),
          skipDuplicates: true,
        });
        return { count: existing.length };
      }
      default:
        throw new AdminActionError("invalidForm");
    }
  });

  if (result.ok) revalidateStorefront();
  return result;
}
