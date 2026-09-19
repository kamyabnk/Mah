import { describe, expect, it } from "vitest";
import { AdminPermissionError, hasPermission, requireAdminPermission, requirePermission } from "@/lib/auth/permissions";

describe("hasPermission", () => {
  it("returns true when the exact permission is present", () => {
    expect(hasPermission(["products.manage"], "products.manage")).toBe(true);
  });

  it("returns true when the wildcard permission is present", () => {
    expect(hasPermission(["*"], "orders.manage")).toBe(true);
  });

  it("returns false when the permission is absent", () => {
    expect(hasPermission(["products.manage"], "orders.manage")).toBe(false);
  });
});

describe("requirePermission", () => {
  it("does not throw when the permission is present", () => {
    expect(() => requirePermission(["orders.manage"], "orders.manage")).not.toThrow();
  });

  it("throws AdminPermissionError when the permission is missing", () => {
    expect(() => requirePermission(["orders.manage"], "products.manage")).toThrow(
      AdminPermissionError
    );
  });

  it("throws when permissions is undefined", () => {
    expect(() => requirePermission(undefined, "products.manage")).toThrow(AdminPermissionError);
  });
});

describe("requireAdminPermission", () => {
  it("returns the admin id when authenticated with the required permission", () => {
    const id = requireAdminPermission(
      { user: { id: "admin_1", permissions: ["products.manage"] } },
      "products.manage"
    );
    expect(id).toBe("admin_1");
  });

  it("throws when there is no session", () => {
    expect(() => requireAdminPermission(null, "products.manage")).toThrow(AdminPermissionError);
  });

  it("throws when the session has no user", () => {
    expect(() => requireAdminPermission({ user: null }, "products.manage")).toThrow(AdminPermissionError);
  });

  it("throws when the permission is missing", () => {
    expect(() =>
      requireAdminPermission({ user: { id: "admin_1", permissions: ["orders.manage"] } }, "products.manage")
    ).toThrow(AdminPermissionError);
  });

  it("allows a wildcard-permission admin through any check", () => {
    const id = requireAdminPermission({ user: { id: "admin_1", permissions: ["*"] } }, "anything.at.all");
    expect(id).toBe("admin_1");
  });
});
