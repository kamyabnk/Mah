"use server";

import { Prisma } from "@prisma/client";
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
  readRequiredString,
  readString,
} from "@/lib/admin/form-data";
import { isUploadedFile, saveUploadedImage } from "@/lib/admin/uploads";

const PERMISSION = "categories.manage";

const slugPattern = /^[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*$/u;

const categorySchema = z.object({
  nameEn: z.string().min(1, "required"),
  nameFa: z.string().min(1, "required"),
  slugEn: z.string().min(1, "required").regex(slugPattern, "invalidSlug"),
  slugFa: z.string().min(1, "required").regex(slugPattern, "invalidSlug"),
  sortOrder: z.number().int().min(0, "mustBePositive"),
});

/** Walks up the parent chain to prove the new parent isn't a descendant. */
async function wouldCreateCycle(categoryId: string, parentId: string): Promise<boolean> {
  let cursor: string | null = parentId;
  const seen = new Set<string>();
  while (cursor) {
    if (cursor === categoryId) return true;
    if (seen.has(cursor)) return true;
    seen.add(cursor);
    const parent: { parentId: string | null } | null = await prisma.category.findUnique({
      where: { id: cursor },
      select: { parentId: true },
    });
    cursor = parent?.parentId ?? null;
  }
  return false;
}

export async function saveCategory(
  _prevState: AdminFormState,
  formData: FormData
): Promise<AdminFormState> {
  const adminId = await tryGuardAdminAction(PERMISSION);
  if (!adminId) return { error: "unauthorized" };

  const parsed = categorySchema.safeParse({
    nameEn: readRequiredString(formData, "nameEn"),
    nameFa: readRequiredString(formData, "nameFa"),
    slugEn: normaliseSlug(readRequiredString(formData, "slugEn")),
    slugFa: normaliseSlug(readRequiredString(formData, "slugFa")),
    sortOrder: readInt(formData, "sortOrder", 0),
  });
  if (!parsed.success) {
    return { error: "invalidForm", fieldErrors: toFieldErrors(parsed.error) };
  }

  const categoryId = readString(formData, "id");
  const locale = readRequiredString(formData, "locale") === "fa" ? "fa" : "en";
  const parentId = readString(formData, "parentId");

  if (categoryId && parentId) {
    if (parentId === categoryId) return { error: "ownParent", fieldErrors: { parentId: "ownParent" } };
    if (await wouldCreateCycle(categoryId, parentId)) {
      return { error: "cycle", fieldErrors: { parentId: "cycle" } };
    }
  }

  // Existing media is kept unless a replacement file is actually attached.
  let image = readString(formData, "currentImage");
  let banner = readString(formData, "currentBanner");
  try {
    const imageFile = formData.get("imageFile");
    if (isUploadedFile(imageFile)) image = await saveUploadedImage(imageFile, "categories");
    const bannerFile = formData.get("bannerFile");
    if (isUploadedFile(bannerFile)) banner = await saveUploadedImage(bannerFile, "categories");
  } catch (error) {
    if (error instanceof AdminActionError) return { error: error.code };
    throw error;
  }

  const data = {
    ...parsed.data,
    descriptionEn: readString(formData, "descriptionEn"),
    descriptionFa: readString(formData, "descriptionFa"),
    seoTitleEn: readString(formData, "seoTitleEn"),
    seoTitleFa: readString(formData, "seoTitleFa"),
    seoDescriptionEn: readString(formData, "seoDescriptionEn"),
    seoDescriptionFa: readString(formData, "seoDescriptionFa"),
    parentId,
    image,
    banner,
    isActive: readBoolean(formData, "isActive"),
  };

  let createdId: string | null = null;

  try {
    if (categoryId) {
      const existing = await prisma.category.findFirst({
        where: { id: categoryId, deletedAt: null },
        select: { id: true },
      });
      if (!existing) return { error: "notFound" };
      await prisma.category.update({ where: { id: categoryId }, data });
    } else {
      const created = await prisma.category.create({ data, select: { id: true } });
      createdId = created.id;
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = error.meta?.target;
      const fields = Array.isArray(target) ? target.map(String) : [String(target ?? "")];
      const field = fields.some((value) => value.includes("slugFa")) ? "slugFa" : "slugEn";
      return { error: "slugTaken", fieldErrors: { [field]: "slugTaken" } };
    }
    throw error;
  }

  revalidateStorefront();

  if (createdId) {
    redirect(`/${locale}/admin/categories/${createdId}`);
  }

  return { success: "saved" };
}

export async function deleteCategory(categoryId: string): Promise<AdminActionResult<undefined>> {
  const result = await runAdminAction(PERMISSION, async () => {
    const children = await prisma.category.count({
      where: { parentId: categoryId, deletedAt: null },
    });
    // Refuse rather than orphan: the admin decides where the children go.
    if (children > 0) throw new AdminActionError("hasChildren");

    await prisma.category.updateMany({
      where: { id: categoryId, deletedAt: null },
      data: { deletedAt: new Date(), isActive: false },
    });
    return undefined;
  });
  if (result.ok) revalidateStorefront();
  return result;
}

export async function setCategoryActive(
  categoryId: string,
  isActive: boolean
): Promise<AdminActionResult<undefined>> {
  const result = await runAdminAction(PERMISSION, async () => {
    await prisma.category.updateMany({
      where: { id: categoryId, deletedAt: null },
      data: { isActive },
    });
    return undefined;
  });
  if (result.ok) revalidateStorefront();
  return result;
}

export async function moveCategory(
  categoryId: string,
  direction: "up" | "down"
): Promise<AdminActionResult<undefined>> {
  const result = await runAdminAction(PERMISSION, async () => {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, deletedAt: null },
      select: { id: true, parentId: true, sortOrder: true },
    });
    if (!category) throw new AdminActionError("notFound");

    // Reordering is scoped to siblings — moving within one level of the tree.
    const siblings = await prisma.category.findMany({
      where: { parentId: category.parentId, deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
      select: { id: true, sortOrder: true },
    });

    const index = siblings.findIndex((sibling) => sibling.id === categoryId);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || targetIndex < 0 || targetIndex >= siblings.length) return undefined;

    // Rewrite the whole sibling run to 0..n-1 so ties in the seeded data
    // (several categories sharing sortOrder 0) can't make the swap a no-op.
    const reordered = [...siblings];
    const [moved] = reordered.splice(index, 1);
    if (moved) reordered.splice(targetIndex, 0, moved);

    await prisma.$transaction(
      reordered.map((sibling, position) =>
        prisma.category.update({ where: { id: sibling.id }, data: { sortOrder: position } })
      )
    );
    return undefined;
  });
  if (result.ok) revalidateStorefront();
  return result;
}

export async function assignProductToCategory(
  categoryId: string,
  productId: string
): Promise<AdminActionResult<undefined>> {
  const result = await runAdminAction(PERMISSION, async () => {
    await prisma.productCategory.createMany({
      data: [{ categoryId, productId }],
      skipDuplicates: true,
    });
    return undefined;
  });
  if (result.ok) revalidateStorefront();
  return result;
}

export async function removeProductFromCategory(
  categoryId: string,
  productId: string
): Promise<AdminActionResult<undefined>> {
  const result = await runAdminAction(PERMISSION, async () => {
    await prisma.productCategory.deleteMany({ where: { categoryId, productId } });
    return undefined;
  });
  if (result.ok) revalidateStorefront();
  return result;
}
