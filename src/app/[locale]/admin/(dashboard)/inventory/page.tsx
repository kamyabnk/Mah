import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AdminPageHeader, Panel } from "@/components/admin/ui";
import { AdminPagination } from "@/components/admin/pagination";
import { StockTable } from "@/components/admin/inventory/stock-table";
import { INVENTORY_PAGE_SIZE, listStockItems, type StockView } from "@/lib/admin/inventory/queries";
import { requireAdminPagePermission } from "@/lib/admin/session";
import { formatNumber, type AdminLocale } from "@/lib/admin/format";
import { cn } from "@/lib/cn";

const VIEWS: StockView[] = ["all", "low", "out"];

export default async function AdminInventoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: rawLocale } = await params;
  const locale: AdminLocale = rawLocale === "fa" ? "fa" : "en";
  await requireAdminPagePermission(rawLocale, "inventory.manage");

  const query = await searchParams;
  const first = (key: string) => {
    const value = query[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const rawView = first("view");
  const view: StockView = VIEWS.includes(rawView as StockView) ? (rawView as StockView) : "all";
  const search = first("q")?.trim() || undefined;
  const page = Math.max(1, Number(first("page") ?? 1) || 1);

  const t = await getTranslations({ locale: rawLocale, namespace: "admin.inventory" });
  const tCommon = await getTranslations({ locale: rawLocale, namespace: "admin.common" });

  const result = await listStockItems(view, search, page);
  const from = result.total === 0 ? 0 : (result.page - 1) * INVENTORY_PAGE_SIZE + 1;
  const to = Math.min(result.page * INVENTORY_PAGE_SIZE, result.total);

  const viewLabel = { all: t("viewAll"), low: t("viewLow"), out: t("viewOut") };

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title={t("title")}
        description={t("subtitle")}
        actions={
          <Link
            href="/admin/inventory/transactions"
            className="rounded-sm border border-espresso/20 px-4 py-2 text-sm text-espresso hover:bg-espresso/5"
          >
            {t("transactions.title")}
          </Link>
        }
      />

      <Panel className="flex flex-wrap items-end gap-4 p-4">
        <div className="flex gap-2">
          {VIEWS.map((value) => (
            <Link
              key={value}
              href={value === "all" ? "/admin/inventory" : `/admin/inventory?view=${value}`}
              className={cn(
                "rounded-sm border px-3 py-1.5 text-sm",
                view === value
                  ? "border-amber bg-amber text-ivory"
                  : "border-espresso/20 text-espresso hover:bg-espresso/5"
              )}
            >
              {viewLabel[value]}
            </Link>
          ))}
        </div>

        <form className="flex flex-1 flex-wrap items-end gap-2">
          <input type="hidden" name="view" value={view} />
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
          <button
            type="submit"
            className="h-10 rounded-sm bg-espresso px-4 text-sm font-medium text-ivory hover:bg-espresso/90"
          >
            {tCommon("search")}
          </button>
        </form>
      </Panel>

      <Panel>
        <StockTable items={result.items} locale={locale} />
        <AdminPagination
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          pageSize={INVENTORY_PAGE_SIZE}
          basePath="/admin/inventory"
          params={{ view: view === "all" ? undefined : view, q: search }}
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
