import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AdminPageHeader } from "@/components/admin/ui";
import { CategoryForm } from "@/components/admin/categories/category-form";
import { getParentOptions } from "@/lib/admin/categories/queries";
import { requireAdminPagePermission } from "@/lib/admin/session";
import type { AdminLocale } from "@/lib/admin/format";

export default async function NewCategoryPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: AdminLocale = rawLocale === "fa" ? "fa" : "en";
  await requireAdminPagePermission(rawLocale, "categories.manage");

  const t = await getTranslations({ locale: rawLocale, namespace: "admin.categories" });
  const tCommon = await getTranslations({ locale: rawLocale, namespace: "admin.common" });
  const parentOptions = await getParentOptions(null);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={t("createCategory")}
        actions={
          <Link href="/admin/categories" className="text-sm text-espresso-light underline">
            {tCommon("back")}
          </Link>
        }
      />
      <CategoryForm locale={locale} category={null} parentOptions={parentOptions} />
    </div>
  );
}
