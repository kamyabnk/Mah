import { describe, expect, it } from "vitest";
import { adminAuth, adminHandlers, adminSignIn, adminSignOut } from "@/lib/auth/admin-auth";

describe("admin auth wiring", () => {
  it("exports the expected NextAuth surface", () => {
    expect(typeof adminAuth).toBe("function");
    expect(typeof adminSignIn).toBe("function");
    expect(typeof adminSignOut).toBe("function");
    expect(typeof adminHandlers.GET).toBe("function");
    expect(typeof adminHandlers.POST).toBe("function");
  });
});
