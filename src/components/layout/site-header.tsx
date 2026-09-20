import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Container } from "@/components/ui/container";
import { customerAuth } from "@/lib/auth/customer-auth";
import { getCartItemCount } from "@/lib/cart/read";
import { LanguageSwitcher } from "./language-switcher";
import { HeaderNavToggle } from "./header-nav-toggle";
import { logoutCustomer } from "@/lib/customer/actions";

export async function SiteHeader({ locale }: { locale: "en" | "fa" }) {
  const t = await getTranslations({ locale, namespace: "nav" });
  const tCommon = await getTranslations({ locale, namespace: "common" });
  const [session, cartCount] = await Promise.all([customerAuth(), getCartItemCount()]);
  const isLoggedIn = Boolean((session?.user as { id?: string } | undefined)?.id);

  return (
    <header className="border-b border-espresso/10 bg-ivory">
      <Container className="flex h-16 items-center justify-between gap-2 sm:gap-4">
        <Link href="/" className="shrink-0 whitespace-nowrap font-display text-lg font-medium text-espresso sm:text-xl">
          {tCommon("brandName")}
        </Link>

        <nav className="hidden items-center gap-6 sm:flex">
          <Link href="/" className="text-sm text-espresso">
            {t("home")}
          </Link>
          <Link href="/candles" className="text-sm text-espresso">
            {t("shopAll")}
          </Link>
        </nav>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/search" aria-label={t("search")} className="text-espresso">
            ⌕
          </Link>
          <Link href="/wishlist" aria-label={t("wishlist")} className="text-espresso">
            ♡
          </Link>
          <Link href="/cart" aria-label={t("cart")} className="relative text-espresso">
            🛍
            {cartCount > 0 && (
              <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-amber text-[10px] text-ivory">
                {cartCount}
              </span>
            )}
          </Link>

          <div className="hidden items-center gap-4 sm:flex">
            {isLoggedIn ? (
              <>
                <Link href="/account/orders" aria-label={t("myOrders")} className="text-sm text-espresso">
                  {t("myOrders")}
                </Link>
                <form action={logoutCustomer}>
                  <button type="submit" className="text-sm text-espresso">
                    {t("logout")}
                  </button>
                </form>
              </>
            ) : (
              <Link href="/account/login" aria-label={t("account")} className="text-espresso">
                {t("account")}
              </Link>
            )}
          </div>

          <LanguageSwitcher />
          <HeaderNavToggle
            homeLabel={t("home")}
            shopLabel={t("shopAll")}
            isLoggedIn={isLoggedIn}
            accountLabel={t("account")}
            myOrdersLabel={t("myOrders")}
            logoutLabel={t("logout")}
          />
        </div>
      </Container>
    </header>
  );
}
