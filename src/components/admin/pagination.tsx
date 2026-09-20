import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

/**
 * Server-rendered pagination: every page is a real link, so the list stays
 * shareable, bookmarkable and usable without JavaScript.
 */
export function AdminPagination({
  page,
  pageCount,
  total,
  pageSize,
  basePath,
  params,
  labels,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  basePath: string;
  /** Current filters, carried across page links. `page` is added here. */
  params: Record<string, string | undefined>;
  labels: { previous: string; next: string; showing: string };
}) {
  const href = (targetPage: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value) search.set(key, value);
    }
    if (targetPage > 1) search.set("page", String(targetPage));
    const query = search.toString();
    return query ? `${basePath}?${query}` : basePath;
  };

  const linkClasses = (enabled: boolean) =>
    cn(
      "rounded-sm border border-espresso/20 px-3 py-1.5 text-sm",
      enabled
        ? "text-espresso hover:bg-espresso/5"
        : "pointer-events-none text-espresso-light/40"
    );

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-espresso/10 px-5 py-3">
      <p className="text-xs text-espresso-light">{labels.showing}</p>
      {total > pageSize && (
        <div className="flex items-center gap-2">
          <Link href={href(page - 1)} aria-disabled={page <= 1} className={linkClasses(page > 1)}>
            {labels.previous}
          </Link>
          <span className="text-sm tabular-nums text-espresso-light">
            {page} / {pageCount}
          </span>
          <Link
            href={href(page + 1)}
            aria-disabled={page >= pageCount}
            className={linkClasses(page < pageCount)}
          >
            {labels.next}
          </Link>
        </div>
      )}
    </div>
  );
}
