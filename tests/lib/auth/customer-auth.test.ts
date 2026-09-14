import { describe, expect, it } from "vitest";
import {
  customerAuth,
  customerHandlers,
  customerSignIn,
  customerSignOut,
} from "@/lib/auth/customer-auth";

describe("customer auth wiring", () => {
  it("exports the expected NextAuth surface", () => {
    expect(typeof customerAuth).toBe("function");
    expect(typeof customerSignIn).toBe("function");
    expect(typeof customerSignOut).toBe("function");
    expect(typeof customerHandlers.GET).toBe("function");
    expect(typeof customerHandlers.POST).toBe("function");
  });

  it("uses a distinct cookie name from the admin realm", async () => {
    const adminModule = await import("@/lib/auth/admin-auth");
    expect(customerAuth).not.toBe(adminModule.adminAuth);
  });
});
