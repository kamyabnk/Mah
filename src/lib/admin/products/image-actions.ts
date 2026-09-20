"use server";

import { prisma } from "@/lib/prisma";
import {
  AdminActionError,
  runAdminAction,
  tryGuardAdminAction,
  type AdminActionResult,
  type AdminFormState,
} from "@/lib/admin/action-result";
import { revalidateStorefront } from "@/lib/admin/revalidate";
import { readString } from "@/lib/admin/form-data";
import { isUploadedFile, saveUploadedImage } from "@/lib/admin/uploads";

const PERMISSION = "products.manage";

/**
 * Renumbers a product's images 0..n-1 and guarantees exactly one primary, so
 * the storefront gallery never has to cope with gaps, ties, or no primary at
 * all. Called after every mutation of the set.
 */
async function normaliseImageOrder(productId: string): Promise<void> {
  const images = await prisma.productImage.findMany({
    where: { productId },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: { id: true, isPrimary: true },
  });
  const first = images[0];
  if (!first) return;

  const primaryId = images.find((image) => image.isPrimary)?.id ?? first.id;

  await prisma.$transaction(
    images.map((image, index) =>
      prisma.productImage.update({
        where: { id: image.id },
        data: { sortOrder: index, isPrimary: image.id === primaryId },
      })
    )
  );
}

export async function uploadProductImage(
  _prevState: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  const adminId = await tryGuardAdminAction(PERMISSION);
  if (!adminId) return { error: "unauthorized" };

  const productId = readString(formData, "productId");
  if (!productId) return { error: "notFound" };

  const file = formData.get("file");
  if (!isUploadedFile(file)) return { error: "invalidType" };

  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: { id: true, _count: { select: { images: true } } },
  });
  if (!product) return { error: "notFound" };

  let url: string;
  try {
    url = await saveUploadedImage(file, `products/${productId}`);
  } catch (error) {
    if (error instanceof AdminActionError) return { error: error.code };
    throw error;
  }

  await prisma.productImage.create({
    data: {
      productId,
      url,
      altEn: readString(formData, "altEn"),
      altFa: readString(formData, "altFa"),
      sortOrder: product._count.images,
      // The very first image of a product becomes its primary automatically.
      isPrimary: product._count.images === 0,
    },
  });

  await normaliseImageOrder(productId);
  revalidateStorefront();
  return { success: "saved" };
}

export async function updateProductImageAlt(
  imageId: string,
  altEn: string | null,
  altFa: string | null
): Promise<AdminActionResult<undefined>> {
  const result = await runAdminAction(PERMISSION, async () => {
    await prisma.productImage.update({
      where: { id: imageId },
      data: { altEn: altEn?.trim() || null, altFa: altFa?.trim() || null },
    });
    return undefined;
  });
  if (result.ok) revalidateStorefront();
  return result;
}

export async function setPrimaryProductImage(
  imageId: string
): Promise<AdminActionResult<undefined>> {
  const result = await runAdminAction(PERMISSION, async () => {
    const image = await prisma.productImage.findUnique({
      where: { id: imageId },
      select: { productId: true },
    });
    if (!image) throw new AdminActionError("notFound");

    await prisma.$transaction([
      prisma.productImage.updateMany({
        where: { productId: image.productId },
        data: { isPrimary: false },
      }),
      prisma.productImage.update({ where: { id: imageId }, data: { isPrimary: true } }),
    ]);
    return undefined;
  });
  if (result.ok) revalidateStorefront();
  return result;
}

export async function moveProductImage(
  imageId: string,
  direction: "up" | "down"
): Promise<AdminActionResult<undefined>> {
  const result = await runAdminAction(PERMISSION, async () => {
    const image = await prisma.productImage.findUnique({
      where: { id: imageId },
      select: { id: true, productId: true, sortOrder: true },
    });
    if (!image) throw new AdminActionError("notFound");

    const neighbour = await prisma.productImage.findFirst({
      where: {
        productId: image.productId,
        sortOrder: direction === "up" ? { lt: image.sortOrder } : { gt: image.sortOrder },
      },
      orderBy: { sortOrder: direction === "up" ? "desc" : "asc" },
      select: { id: true, sortOrder: true },
    });
    // Already at the end of the list: nothing to swap with.
    if (!neighbour) return undefined;

    await prisma.$transaction([
      prisma.productImage.update({
        where: { id: image.id },
        data: { sortOrder: neighbour.sortOrder },
      }),
      prisma.productImage.update({
        where: { id: neighbour.id },
        data: { sortOrder: image.sortOrder },
      }),
    ]);
    return undefined;
  });
  if (result.ok) revalidateStorefront();
  return result;
}

export async function deleteProductImage(imageId: string): Promise<AdminActionResult<undefined>> {
  const result = await runAdminAction(PERMISSION, async () => {
    const image = await prisma.productImage.findUnique({
      where: { id: imageId },
      select: { id: true, productId: true },
    });
    if (!image) throw new AdminActionError("notFound");

    await prisma.productImage.delete({ where: { id: imageId } });
    // The stored file is deliberately left in place: `duplicateProduct` makes
    // copies that reference the same URL, so removing it could break another
    // product's gallery.
    await normaliseImageOrder(image.productId);
    return undefined;
  });
  if (result.ok) revalidateStorefront();
  return result;
}
