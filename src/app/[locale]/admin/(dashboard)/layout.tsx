import type { ReactNode } from "react";
import { AdminChromeReset } from "@/components/admin/admin-chrome-reset";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminTopbar } from "@/components/admin/admin-topbar";
import { requireAdminPage } from "@/lib/admin/session";
import { visibleNavGroups } from "@/lib/admin/nav";

/**
 * Never prerender or cache anything under the admin shell. Reading the session
 * already forces these routes dynamic in practice, but stating it here means a
 * future page that happens not to touch cookies cannot silently become static
 * and serve one admin's view to another.
 */
export const dynamic = "force-dynamic";

/**
 * Every admin route except `/admin/login` renders inside this shell. The
 * session check here is defence in depth: `src/middleware.ts` already redirects
 * anonymous visitors, but a security boundary is never left to the middleware
 * alone — each page and each Server Action re-checks server-side too.
 */
export default async function AdminDashboardLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await requireAdminPage(locale);
  const groups = visibleNavGroups(session.permissions);

  return (
    <div data-admin-root className="min-h-screen bg-ivory-dark">
      <AdminChromeReset />
      <div className="flex min-h-screen flex-col lg:flex-row">
        <AdminSidebar groups={groups} />
        <div className="flex min-w-0 flex-1 flex-col">
          <AdminTopbar locale={locale} session={session} />
          <main className="min-w-0 flex-1 p-4 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
