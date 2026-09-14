import { describe, expect, it } from "vitest";
import { authorizeAdmin, type AdminRecord } from "@/lib/auth/admin-authorize";
import { hashPassword } from "@/lib/auth/password";

const buildAdmin = async (overrides: Partial<AdminRecord> = {}): Promise<AdminRecord> => ({
  id: "admin_1",
  email: "owner@mahcandle.test",
  name: "Store Owner",
  passwordHash: await hashPassword("super-secret-password"),
  isActive: true,
  role: { key: "super_admin", permissions: ["*"] },
  ...overrides,
});

describe("authorizeAdmin", () => {
  it("returns the authorized admin for valid credentials", async () => {
    const admin = await buildAdmin();
    const result = await authorizeAdmin(
      { email: "owner@mahcandle.test", password: "super-secret-password" },
      async () => admin
    );
    expect(result).toEqual({
      id: "admin_1",
      email: "owner@mahcandle.test",
      name: "Store Owner",
      role: "super_admin",
      permissions: ["*"],
    });
  });

  it("returns null for a wrong password", async () => {
    const admin = await buildAdmin();
    const result = await authorizeAdmin(
      { email: "owner@mahcandle.test", password: "wrong-password" },
      async () => admin
    );
    expect(result).toBeNull();
  });

  it("returns null when the admin is inactive", async () => {
    const admin = await buildAdmin({ isActive: false });
    const result = await authorizeAdmin(
      { email: "owner@mahcandle.test", password: "super-secret-password" },
      async () => admin
    );
    expect(result).toBeNull();
  });

  it("returns null when no admin is found", async () => {
    const result = await authorizeAdmin(
      { email: "missing@mahcandle.test", password: "super-secret-password" },
      async () => null
    );
    expect(result).toBeNull();
  });

  it("returns null when credentials are missing fields", async () => {
    const result = await authorizeAdmin({ email: "owner@mahcandle.test" }, async () => null);
    expect(result).toBeNull();
  });
});
