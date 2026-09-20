import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  AdminPageHeader,
  EmptyState,
  Panel,
  Pill,
  Table,
  TableWrap,
  Td,
  Th,
} from "@/components/admin/ui";
import { AdminPagination } from "@/components/admin/pagination";
import { CUSTOMERS_PAGE_SIZE, listAdminCustomers } from "@/lib/admin/customers/queries";
import { requireAdminPagePermission } from "@/lib/admin/session";
import { formatDate, formatMoney, formatNumber, type AdminLocale } from "@/lib/admin/format";

export default async function AdminCustomersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale: rawLocale } = await params;
  const locale: AdminLocale = rawLocale === "fa" ? "fa" : "en";
  await requireAdminPagePermission(rawLocale, "customers.view");

  const query = await searchParams;
  const first = (key: string) => {
    const value = query[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const search = first("q")?.trim() || undefined;
  const page = Math.max(1, Number(first("page") ?? 1) || 1);

  const t = await getTranslations({ locale: rawLocale, namespace: "admin.customers" });
  const tCommon = await getTranslations({ locale: rawLocale, namespace: "admin.common" });

  const result = await listAdminCustomers(search, page);
  const from = result.total === 0 ? 0 : (result.page - 1) * CUSTOMERS_PAGE_SIZE + 1;
  const to = Math.min(result.page * CUSTOMERS_PAGE_SIZE, result.total);

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title={t("title")} description={t("subtitle")} />

      <Panel className="p-4">
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
          <button
            type="submit"
            className="h-10 rounded-sm bg-espresso px-4 text-sm font-medium text-ivory hover:bg-espresso/90"
          >
            {tCommon("search")}
          </button>
          <Link
            href="/admin/customers"
            className="h-10 rounded-sm border border-espresso/20 px-4 text-sm leading-10 text-espresso hover:bg-espresso/5"
          >
            {tCommon("reset")}
          </Link>
        </form>
      </Panel>

      <Panel>
        {result.rows.length === 0 ? (
          <EmptyState>{t("noCustomers")}</EmptyState>
        ) : (
          <TableWrap>
            <Table>
              <thead>
                <tr>
                  <Th>{t("columnCustomer")}</Th>
                  <Th>{t("columnEmail")}</Th>
                  <Th>{t("columnOrders")}</Th>
                  <Th>{t("columnSpend")}</Th>
                  <Th>{t("columnJoined")}</Th>
                  <Th>{t("columnStatus")}</Th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => (
                  <tr key={row.id} className="hover:bg-ivory-dark/30">
                    <Td>
                      <Link
                        href={`/admin/customers/${row.id}`}
                        className="font-medium text-amber underline"
                      >
                        {row.firstName} {row.lastName}
                      </Link>
                      {row.phone && (
                        <span className="block text-xs text-espresso-light">{row.phone}</span>
                      )}
                    </Td>
                    <Td className="text-sm text-espresso-light">{row.email}</Td>
                    <Td className="tabular-nums">{formatNumber(row.orderCount, locale)}</Td>
                    <Td className="whitespace-nowrap tabular-nums">
                      {formatMoney(row.totalSpend, locale)}
                    </Td>
                    <Td className="whitespace-nowrap text-xs text-espresso-light">
                      {formatDate(row.createdAt, locale)}
                    </Td>
                    <Td>
                      <Pill tone={row.isActive ? "positive" : "danger"}>
                        {row.isActive ? t("active") : t("disabled")}
                      </Pill>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        )}

        <AdminPagination
          page={result.page}
          pageCount={result.pageCount}
          total={result.total}
          pageSize={CUSTOMERS_PAGE_SIZE}
          basePath="/admin/customers"
          params={{ q: search }}
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
