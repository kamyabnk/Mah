"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { activeNavHref, type AdminNavGroup } from "@/lib/admin/nav";

export function AdminSidebar({ groups }: { groups: AdminNavGroup[] }) {
  const t = useTranslations("admin.nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = activeNavHref(pathname, groups);

  const nav = (
    <nav className="flex flex-col gap-6">
      {groups.map((group, index) => (
        <div key={group.key ?? `group-${index}`} className="flex flex-col gap-1">
          {group.key && (
            <p className="px-3 pb-1 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-ivory/40">
              {t(group.key)}
            </p>
          )}
          {group.items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              aria-current={active === item.href ? "page" : undefined}
              className={cn(
                "rounded-sm px-3 py-2 text-sm transition-colors",
                active === item.href
                  ? "bg-amber text-ivory"
                  : "text-ivory/75 hover:bg-ivory/10 hover:text-ivory"
              )}
            >
              {t(item.key)}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );

  return (
    <>
      {/* Mobile: a toggle in the flow, and the panel below it when open. */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          className="w-full rounded-sm bg-espresso px-4 py-3 text-start text-sm font-medium text-ivory"
        >
          {t("menu")}
        </button>
        {open && <div className="mt-2 rounded-md bg-espresso p-4">{nav}</div>}
      </div>

      {/* Desktop: a persistent column. `border-e` keeps the divider on the
          inner edge under both LTR and RTL. */}
      <aside className="hidden w-60 shrink-0 border-e border-ivory/10 bg-espresso p-4 lg:block">
        <p className="px-3 pb-6 font-display text-lg font-medium text-ivory">MAH</p>
        {nav}
      </aside>
    </>
  );
}
