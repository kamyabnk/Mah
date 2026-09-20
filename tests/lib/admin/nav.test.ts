import { describe, expect, it } from "vitest";
import { activeNavHref, ADMIN_NAV, visibleNavGroups } from "@/lib/admin/nav";

const hrefsOf = (groups: ReturnType<typeof visibleNavGroups>) =>
  groups.flatMap((group) => group.items.map((item) => item.href));

describe("visibleNavGroups", () => {
  it("shows every section to a wildcard admin", () => {
    const hrefs = hrefsOf(visibleNavGroups(["*"]));
    expect(hrefs).toContain("/admin/products");
    expect(hrefs).toContain("/admin/categories");
    expect(hrefs).toContain("/admin/inventory");
    expect(hrefs).toContain("/admin/orders");
    expect(hrefs).toContain("/admin/customers");
  });

  it("hides sections the role cannot use", () => {
    // Seeded `order_manager`: orders plus customer read/write, no catalogue.
    const hrefs = hrefsOf(visibleNavGroups(["orders.manage", "customers.view", "customers.manage"]));
    expect(hrefs).toContain("/admin/orders");
    expect(hrefs).toContain("/admin/customers");
    expect(hrefs).not.toContain("/admin/products");
    expect(hrefs).not.toContain("/admin/inventory");
  });

  it("always keeps the dashboard, which needs no permission", () => {
    expect(hrefsOf(visibleNavGroups([]))).toEqual(["/admin"]);
  });

  it("drops groups left with no visible items", () => {
    const groups = visibleNavGroups([]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.key).toBeNull();
  });
});

describe("activeNavHref", () => {
  const groups = visibleNavGroups(["*"]);

  it("matches the dashboard only on an exact path", () => {
    expect(activeNavHref("/admin", groups)).toBe("/admin");
  });

  it("matches a section from one of its child routes", () => {
    expect(activeNavHref("/admin/products/abc123", groups)).toBe("/admin/products");
  });

  it("prefers the longest match so a nested section wins over its parent", () => {
    // Both /admin/inventory and /admin/inventory/transactions prefix this path.
    expect(activeNavHref("/admin/inventory/transactions", groups)).toBe(
      "/admin/inventory/transactions"
    );
  });

  it("does not treat a shared prefix as a match", () => {
    expect(activeNavHref("/admin/productsomething", groups)).toBeNull();
  });

  it("returns null for a path outside the nav", () => {
    expect(activeNavHref("/admin/settings", groups)).toBeNull();
  });
});

describe("ADMIN_NAV", () => {
  it("declares a permission for every non-dashboard entry", () => {
    const items = ADMIN_NAV.flatMap((group) => group.items);
    for (const item of items) {
      if (item.href === "/admin") continue;
      expect(item.permission, `${item.href} must declare a permission`).toBeTruthy();
    }
  });
});
