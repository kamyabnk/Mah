import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AdminPageHeader } from "@/components/admin/ui";
import { ProductForm } from "@/components/admin/products/product-form";
import { ProductImages } from "@/components/admin/products/product-images";
import { ProductVariants } from "@/components/admin/products/product-variants";
import { getAdminProduct, getProductFormOptions } from "@/lib/admin/products/queries";
import { requireAdminPagePermission } from "@/lib/admin/session";
import { localised, type AdminLocale } from "@/lib/admin/format";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale: rawLocale, id } = await params;
  const locale: AdminLocale = rawLocale === "fa" ? "fa" : "en";
  await requireAdminPagePermission(rawLocale, "products.manage");

  const [product, options] = await Promise.all([getAdminProduct(id), getProductFormOptions()]);
  if (!product) notFound();

  const t = await getTranslations({ locale: rawLocale, namespace: "admin.products" });
  const tCommon = await getTranslations({ locale: rawLocale, namespace: "admin.common" });

  const storefrontHref = `/product/${locale === "fa" ? product.slugFa : product.slugEn}`;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={t("editProduct")}
        description={localised(locale, product.nameEn, product.nameFa)}
        actions={
          <>
            <Link href={storefrontHref} className="text-sm text-amber underline">
              {tCommon("view")}
            </Link>
            <Link href="/admin/products" className="text-sm text-espresso-light underline">
              {tCommon("back")}
            </Link>
          </>
        }
      />

      <ProductForm locale={locale} product={product} options={options} />

      <ProductImages productId={product.id} images={product.images} />

      <ProductVariants
        productId={product.id}
        hasVariants={product.hasVariants}
        variants={product.variants.map((variant) => ({
          id: variant.id,
          sku: variant.sku,
          nameEn: variant.nameEn,
          nameFa: variant.nameFa,
          size: variant.size,
          color: variant.color,
          fragrance: variant.fragrance,
          price: variant.price,
          salePrice: variant.salePrice,
          stockQuantity: variant.stockQuantity,
          lowStockThreshold: variant.lowStockThreshold,
          isActive: variant.isActive,
        }))}
      />
    </div>
  );
}
