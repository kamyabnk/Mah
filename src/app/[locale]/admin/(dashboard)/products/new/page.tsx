import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AdminPageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/products/product-form";
import { getProductFormOptions } from "@/lib/admin/products/queries";
import { requireAdminPagePermission } from "@/lib/admin/session";
import type { AdminLocale } from "@/lib/admin/format";

export default async function NewProductPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: AdminLocale = rawLocale === "fa" ? "fa" : "en";
  await requireAdminPagePermission(rawLocale, "products.manage");

  const t = await getTranslations({ locale: rawLocale, namespace: "admin.products" });
  const tCommon = await getTranslations({ locale: rawLocale, namespace: "admin.common" });
  const options = await getProductFormOptions();

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={t("createProduct")}
        description={t("hints.imagesAfterSave")}
        actions={
          <Link href="/admin/products" className="text-sm text-espresso-light underline">
            {tCommon("back")}
          </Link>
        }
      />
      <ProductForm locale={locale} product={null} options={options} />
    </div>
  );
}
