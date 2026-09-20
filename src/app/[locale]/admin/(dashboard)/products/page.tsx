import type { ProductStatus } from "@prisma/client";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { AdminPagination } from "@/components/admin/pagination";
import { ProductTable } from "@/components/admin/products/product-table";
import { listAdminProducts, PRODUCTS_PAGE_SIZE } from "@/lib/admin/products/queries";
import { prisma } from "@/lib/prisma";
import { formatNumber, localised, type AdminLocale } from "@/lib/admin/format";
import { requireAdminPagePermission } from "@/lib/admin/session";

const STATUSES: ProductStatus[] = ["DRAFT", "PUBLISHED", "ARCHIVED"];

function parseStatus(value: string | undefined): ProductStatus | undefined {
  return STATUSES.includes(value as ProductStatus) ? (value as ProductStatus) : undefined;
}

export default async function AdminProductsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: rawLocale } = await params;
  const locale: AdminLocale = rawLocale === "fa" ? "fa" : "en";
  await requireAdminPagePermission(rawLocale, "products.manage");

  const query = await searchParams;
  const first = (key: string) => {
    const value = query[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const search = first("q")?.trim() || undefined;
  const status = parseStatus(first("status"));
  const categoryId = first("category") || undefined;
  const page = Math.max(1, Number(first("page") ?? 1) || 1);

  const t = await getTranslations({ locale: rawLocale, namespace: "admin.products" });
  const tCommon = await getTranslations({ locale: rawLocale, namespace: "admin.common" });
  const tStatus = await getTranslations({ locale: rawLocale, namespace: "admin.productStatus" });

  const [result, categories] = await Promise.all([
    listAdminProducts({ search, status, categoryId, page }),
    prisma.category.findMany({
      where: { deletedAt: null },
      orderBy: [{ sortOrder: "asc" }, { nameEn: "asc" }],
      select: { id: true, nameEn: true, nameFa: true },
    }),
  ]);

  const from = result.total === 0 ? 0 : (result.page - 1) * PRODUCTS_PAGE_SIZE + 1;
  const to = Math.min(result.page * PRODUCTS_PAGE_SIZE, result.total);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Link
            href="/admin/products/new"
            className="rounded-sm bg-amber px-4 py-2 text-sm font-medium text-ivory hover:bg-amber/90"
          >
            {t("newProduct")}
          </Link>
        }
      />

      <Panel className="p-4">
        {/* A plain GET form: filters stay in the URL, so the list is
            shareable and works with the browser's back button. */}
        <form className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-48 flex-1 flex-col gap-1.5">
            <span className="text-xs font-medium text-espresso-light">{tCommon("search")}</span>
            <input
              type="search"
              name="q"
              defaultValue={search ?? ""}
              placeholder={t("searchPlaceholder")}
              className="h-10 w-full rounded-sm border border-espresso/20 bg-ivory px-3 text-sm text-espresso"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-espresso-light">{t("filterStatus")}</span>
            <select
              name="status"
              defaultValue={status ?? ""}
              className="h-10 rounded-sm border border-espresso/20 bg-ivory px-2 text-sm text-espresso"
            >
              <option value="">{tCommon("all")}</option>
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {tStatus(value)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-espresso-light">{t("filterCategory")}</span>
            <select
              name="category"
              defaultValue={categoryId ?? ""}
              className="h-10 max-w-52 rounded-sm border border-espresso/20 bg-ivory px-2 text-sm text-espresso"
            >
              <option value="">{tCommon("all")}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {localised(locale, category.nameEn, category.nameFa)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="h-10 rounded-sm bg-espresso px-4 text-sm font-medium text-ivory hover:bg-espresso/90"
          >
            {tCommon("filter")}
          </button>
          <Link
            href="/admin/products"
            className="h-10 rounded-sm border border-espresso/20 px-4 text-sm leading-10 text-espresso hover:bg-espresso/5"
          >
            {tCommon("reset")}
          </Link>
        </form>
      </Panel>

      <Panel>
        <ProductTable rows={result.rows} locale={locale} categories={categories} />
        <AdminPagination
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          pageSize={PRODUCTS_PAGE_SIZE}
          basePath="/admin/products"
          params={{ q: search, status, category: categoryId }}
          labels={{
            previous: tCommon("previous"),
            next: tCommon("next"),
            showing: tCommon("showing", {
              from: formatNumber(from, locale),
              to: formatNumber(to, locale),
              total: formatNumber(result.total, locale),
            }),
          }}
        />
      </Panel>
    </div>
  );
}
