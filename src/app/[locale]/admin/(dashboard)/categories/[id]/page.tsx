import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AdminPageHeader } from "@/components/admin/ui";
import { CategoryForm } from "@/components/admin/categories/category-form";
import { CategoryProducts } from "@/components/admin/categories/category-products";
import {
  getAdminCategory,
  getAssignableProducts,
  getParentOptions,
} from "@/lib/admin/categories/queries";
import { requireAdminPagePermission } from "@/lib/admin/session";
import { localised, type AdminLocale } from "@/lib/admin/format";

export default async function EditCategoryPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: rawLocale, id } = await params;
  const locale: AdminLocale = rawLocale === "fa" ? "fa" : "en";
  await requireAdminPagePermission(rawLocale, "categories.manage");

  const [category, parentOptions, assignable] = await Promise.all([
    getAdminCategory(id),
    getParentOptions(id),
    getAssignableProducts(id),
  ]);
  if (!category) notFound();

  const t = await getTranslations({ locale: rawLocale, namespace: "admin.categories" });
  const tCommon = await getTranslations({ locale: rawLocale, namespace: "admin.common" });

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={t("editCategory")}
        description={localised(locale, category.nameEn, category.nameFa)}
        actions={
          <>
            <Link
              href={`/candles/${locale === "fa" ? category.slugFa : category.slugEn}`}
              className="text-sm text-amber underline"
            >
              {tCommon("view")}
            </Link>
            <Link href="/admin/categories" className="text-sm text-espresso-light underline">
              {tCommon("back")}
            </Link>
          </>
        }
      />

      <CategoryForm locale={locale} category={category} parentOptions={parentOptions} />

      <CategoryProducts
        categoryId={category.id}
        locale={locale}
        assigned={category.assignedProducts}
        assignable={assignable}
      />
    </div>
  );
}
