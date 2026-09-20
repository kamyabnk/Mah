import { beforeEach, describe, expect, it, vi } from "vitest";

const adminAuthMock = vi.fn();

// Mocking the auth module keeps this a pure test of the guard's decision logic,
// with the session as the only input — no NextAuth or database involved.
vi.mock("@/lib/auth/admin-auth", () => ({
  adminAuth: () => adminAuthMock(),
}));

import {
  AdminActionError,
  runAdminAction,
  tryGuardAdminAction,
} from "@/lib/admin/action-result";

beforeEach(() => {
  adminAuthMock.mockReset();
});

describe("runAdminAction", () => {
  it("runs the callback and hands it the acting admin's id", async () => {
    adminAuthMock.mockResolvedValue({ user: { id: "admin_1", permissions: ["products.manage"] } });

    const spy = vi.fn().mockResolvedValue("done");
    const result = await runAdminAction("products.manage", spy);

    expect(result).toEqual({ ok: true, data: "done" });
    expect(spy).toHaveBeenCalledWith("admin_1");
  });

  it("refuses and never runs the callback when the permission is missing", async () => {
    adminAuthMock.mockResolvedValue({ user: { id: "admin_1", permissions: ["orders.manage"] } });

    const spy = vi.fn();
    const result = await runAdminAction("products.manage", spy);

    expect(result).toEqual({ ok: false, error: "UNAUTHORIZED" });
    expect(spy).not.toHaveBeenCalled();
  });

  it("refuses when there is no session at all", async () => {
    adminAuthMock.mockResolvedValue(null);

    const spy = vi.fn();
    const result = await runAdminAction("products.manage", spy);

    expect(result).toEqual({ ok: false, error: "UNAUTHORIZED" });
    expect(spy).not.toHaveBeenCalled();
  });

  it("ignores a client-shaped session that carries no real user id", async () => {
    // A forged payload with permissions but no id must not pass.
    adminAuthMock.mockResolvedValue({ user: { permissions: ["*"] } });

    const spy = vi.fn();
    const result = await runAdminAction("products.manage", spy);

    expect(result).toEqual({ ok: false, error: "UNAUTHORIZED" });
    expect(spy).not.toHaveBeenCalled();
  });

  it("lets a wildcard admin through", async () => {
    adminAuthMock.mockResolvedValue({ user: { id: "admin_root", permissions: ["*"] } });

    const result = await runAdminAction("anything.at.all", async (id) => id);

    expect(result).toEqual({ ok: true, data: "admin_root" });
  });

  it("converts an AdminActionError into a translatable failure code", async () => {
    adminAuthMock.mockResolvedValue({ user: { id: "admin_1", permissions: ["*"] } });

    const result = await runAdminAction("products.manage", async () => {
      throw new AdminActionError("notFound");
    });

    expect(result).toEqual({ ok: false, error: "notFound" });
  });

  it("lets an unexpected error propagate rather than reporting a false success", async () => {
    adminAuthMock.mockResolvedValue({ user: { id: "admin_1", permissions: ["*"] } });

    await expect(
      runAdminAction("products.manage", async () => {
        throw new Error("database exploded");
      })
    ).rejects.toThrow("database exploded");
  });
});

describe("tryGuardAdminAction", () => {
  it("returns the admin id when permitted", async () => {
    adminAuthMock.mockResolvedValue({ user: { id: "admin_1", permissions: ["orders.manage"] } });
    await expect(tryGuardAdminAction("orders.manage")).resolves.toBe("admin_1");
  });

  it("returns null instead of throwing so a form can render the refusal", async () => {
    adminAuthMock.mockResolvedValue({ user: { id: "admin_1", permissions: ["orders.manage"] } });
    await expect(tryGuardAdminAction("products.manage")).resolves.toBeNull();
  });
});
