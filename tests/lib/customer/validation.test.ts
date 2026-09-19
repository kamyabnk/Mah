import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema } from "@/lib/customer/validation";

describe("registerSchema", () => {
  const valid = {
    firstName: "Sara",
    lastName: "Ahmadi",
    email: "Sara@Example.com",
    password: "correct-horse-battery",
    confirmPassword: "correct-horse-battery",
  };

  it("accepts valid input and lowercases the email", () => {
    const result = registerSchema.parse(valid);
    expect(result.email).toBe("sara@example.com");
  });

  it("rejects mismatched passwords", () => {
    const result = registerSchema.safeParse({ ...valid, confirmPassword: "different" });
    expect(result.success).toBe(false);
  });

  it("rejects a short password", () => {
    const result = registerSchema.safeParse({ ...valid, password: "short", confirmPassword: "short" });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = registerSchema.safeParse({ ...valid, email: "not-an-email" });
    expect(result.success).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    const result = loginSchema.safeParse({ email: "a@b.com", password: "x" });
    expect(result.success).toBe(true);
  });

  it("rejects a missing password", () => {
    const result = loginSchema.safeParse({ email: "a@b.com", password: "" });
    expect(result.success).toBe(false);
  });
});
