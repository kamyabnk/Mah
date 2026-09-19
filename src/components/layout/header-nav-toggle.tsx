"use client";

import { useState } from "react";
import { Link } from "@/i18n/navigation";

export function HeaderNavToggle({ homeLabel, shopLabel }: { homeLabel: string; shopLabel: string }) {
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
        <nav className="absolute inset-x-0 top-16 flex flex-col gap-3 border-b border-espresso/10 bg-ivory p-4">
          <Link href="/" onClick={() => setOpen(false)} className="text-sm text-espresso">
            {homeLabel}
          </Link>
          <Link href="/candles" onClick={() => setOpen(false)} className="text-sm text-espresso">
            {shopLabel}
          </Link>
        </nav>
      )}
    </div>
  );
}
