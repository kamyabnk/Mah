import { AdminChromeReset } from "@/components/admin/admin-chrome-reset";
import { AdminLoginForm } from "@/components/admin/admin-login-form";

/**
 * Deliberately outside the `(dashboard)` route group, so it renders without the
 * admin sidebar/top bar. `src/middleware.ts` also exempts this path from the
 * admin session guard — it is the one admin route an anonymous visitor may see.
 */
export default async function AdminLoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div data-admin-root className="flex min-h-screen items-center justify-center bg-ivory-dark px-6 py-16">
      <AdminChromeReset />
      <AdminLoginForm locale={locale} />
    </div>
  );
}
