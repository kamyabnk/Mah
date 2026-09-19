import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

interface PaginationProps {
  page: number;
  pageCount: number;
  buildHref: (page: number) => string;
}

export function Pagination({ page, pageCount, buildHref }: PaginationProps) {
  if (pageCount <= 1) return null;

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);

  return (
    <nav aria-label="Pagination" className="flex items-center justify-center gap-2 pt-8">
      {page > 1 && (
        <Link href={buildHref(page - 1)} className="px-3 py-2 text-sm text-espresso">
          ‹
        </Link>
      )}
      {pages.map((p) => (
        <Link
          key={p}
          href={buildHref(p)}
          aria-current={p === page ? "page" : undefined}
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-sm text-sm",
            p === page ? "bg-amber text-ivory" : "text-espresso hover:bg-espresso/5"
          )}
        >
          {p}
        </Link>
      ))}
      {page < pageCount && (
        <Link href={buildHref(page + 1)} className="px-3 py-2 text-sm text-espresso">
          ›
        </Link>
      )}
    </nav>
  );
}
