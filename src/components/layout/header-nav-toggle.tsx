"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";
import { logoutCustomer } from "@/lib/customer/actions";

interface HeaderNavToggleProps {
  homeLabel: string;
  shopLabel: string;
  isLoggedIn: boolean;
  accountLabel: string;
  myOrdersLabel: string;
  logoutLabel: string;
}

export function HeaderNavToggle({
  homeLabel,
  shopLabel,
  isLoggedIn,
  accountLabel,
  myOrdersLabel,
  logoutLabel,
}: HeaderNavToggleProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        aria-label="Toggle menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="text-espresso"
      >
        ☰
      </button>
      {open && (
        <nav className="absolute inset-x-0 top-16 z-20 flex flex-col gap-3 border-b border-espresso/10 bg-ivory p-4 shadow-sm">
          <Link href="/" onClick={() => setOpen(false)} className="text-sm text-espresso">
            {homeLabel}
          </Link>
          <Link href="/candles" onClick={() => setOpen(false)} className="text-sm text-espresso">
            {shopLabel}
          </Link>
          <div className="border-t border-espresso/10 pt-3">
            {isLoggedIn ? (
              <div className="flex flex-col gap-3">
                <Link href="/account/orders" onClick={() => setOpen(false)} className="text-sm text-espresso">
                  {myOrdersLabel}
                </Link>
                <form action={logoutCustomer}>
                  <button type="submit" className="text-sm text-espresso">
                    {logoutLabel}
                  </button>
                </form>
              </div>
            ) : (
              <Link href="/account/login" onClick={() => setOpen(false)} className="text-sm text-espresso">
                {accountLabel}
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}
