import { describe, expect, it } from "vitest";
import { envSchema } from "@/env";

describe("envSchema", () => {
  it("parses a valid environment", () => {
    const result = envSchema.parse({
      DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
      ADMIN_AUTH_SECRET: "a".repeat(32),
      CUSTOMER_AUTH_SECRET: "b".repeat(32),
      NODE_ENV: "test",
    });
    expect(result.DATABASE_URL).toBe("postgresql://user:pass@localhost:5432/db");
  });

  it("rejects a short ADMIN_AUTH_SECRET", () => {
    expect(() =>
      envSchema.parse({
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        ADMIN_AUTH_SECRET: "too-short",
        CUSTOMER_AUTH_SECRET: "b".repeat(32),
      })
    ).toThrow();
  });

  it("rejects a missing DATABASE_URL", () => {
    expect(() =>
      envSchema.parse({
        ADMIN_AUTH_SECRET: "a".repeat(32),
        CUSTOMER_AUTH_SECRET: "b".repeat(32),
      })
    ).toThrow();
  });
});
