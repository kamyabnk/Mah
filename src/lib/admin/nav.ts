import { hasPermission } from "@/lib/auth/permissions";

export interface AdminNavItem {
  /** Key under the `admin.nav` message namespace. */
  key: string;
  href: string;
  /** `null` means every signed-in admin may see it. */
  permission: string | null;
  /**
   * Active only on an exact path match. Needed for `/admin`, which prefixes
   * every other admin route and would otherwise light up everywhere.
   */
  exact?: boolean;
}

export interface AdminNavGroup {
  /** Key under the `admin.nav` message namespace, or `null` for an unlabelled group. */
  key: string | null;
  items: AdminNavItem[];
}

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    key: null,
    items: [{ key: "dashboard", href: "/admin", permission: null, exact: true }],
  },
  {
    key: "catalogGroup",
    items: [
      { key: "products", href: "/admin/products", permission: "products.manage" },
      { key: "categories", href: "/admin/categories", permission: "categories.manage" },
      { key: "inventory", href: "/admin/inventory", permission: "inventory.manage" },
      {
        key: "inventoryTransactions",
        href: "/admin/inventory/transactions",
        permission: "inventory.manage",
      },
    ],
  },
  {
    key: "salesGroup",
    items: [
      { key: "orders", href: "/admin/orders", permission: "orders.manage" },
      { key: "customers", href: "/admin/customers", permission: "customers.view" },
    ],
  },
];

/**
 * Hides nav entries the admin's role cannot use. This is presentation only —
 * the security boundary is `requireAdminPermission` inside each Server Action
 * and `requireAdminPagePermission` on each page.
 */
export function visibleNavGroups(permissions: string[]): AdminNavGroup[] {
  return ADMIN_NAV.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => item.permission === null || hasPermission(permissions, item.permission)
    ),
  })).filter((group) => group.items.length > 0);
}

/**
 * Picks the single active nav entry: every href that prefixes the current path
 * is a candidate, and the longest one wins so `/admin/inventory/transactions`
 * does not light up `/admin/inventory` as well.
 */
export function activeNavHref(pathname: string, groups: AdminNavGroup[]): string | null {
  let best: string | null = null;
  for (const group of groups) {
    for (const item of group.items) {
      const matches = item.exact
        ? pathname === item.href
        : pathname === item.href || pathname.startsWith(`${item.href}/`);
      if (matches && (best === null || item.href.length > best.length)) {
        best = item.href;
      }
    }
  }
  return best;
}
