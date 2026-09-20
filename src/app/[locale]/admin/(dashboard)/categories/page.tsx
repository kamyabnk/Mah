import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { CategoryTable } from "@/components/admin/categories/category-table";
import { listAdminCategories } from "@/lib/admin/categories/queries";
import { requireAdminPagePermission } from "@/lib/admin/session";
import type { AdminLocale } from "@/lib/admin/format";

export default async function AdminCategoriesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: AdminLocale = rawLocale === "fa" ? "fa" : "en";
  await requireAdminPagePermission(rawLocale, "categories.manage");

  const t = await getTranslations({ locale: rawLocale, namespace: "admin.categories" });
  const rows = await listAdminCategories();

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Link
            href="/admin/categories/new"
            className="rounded-sm bg-amber px-4 py-2 text-sm font-medium text-ivory hover:bg-amber/90"
          >
            {t("newCategory")}
          </Link>
        }
      />
      <Panel>
        <CategoryTable rows={rows} locale={locale} />
      </Panel>
    </div>
  );
}
