import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { logoutAdmin } from "@/lib/admin/auth-actions";
import type { AdminSession } from "@/lib/admin/session";

export async function AdminTopbar({
  locale,
  session,
}: {
  locale: string;
  session: AdminSession;
}) {
  const t = await getTranslations({ locale, namespace: "admin.nav" });

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-espresso/10 bg-ivory px-5 py-3">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-espresso">{session.name}</p>
        <p className="truncate text-xs text-espresso-light">
          {session.email}
          {session.role ? ` · ${session.role}` : ""}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <Link href="/" className="text-sm text-espresso-light underline">
          {t("viewStore")}
        </Link>
        <form action={logoutAdmin}>
          <input type="hidden" name="locale" value={locale} />
          <button
            type="submit"
            className="rounded-sm border border-espresso/20 px-3 py-1.5 text-sm text-espresso transition-colors hover:bg-espresso/5"
          >
            {t("logout")}
          </button>
        </form>
      </div>
    </header>
  );
}
