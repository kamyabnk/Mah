import { describe, expect, it } from "vitest";
import { authorizeCustomer, type CustomerRecord } from "@/lib/auth/customer-authorize";
import { hashPassword } from "@/lib/auth/password";

const buildCustomer = async (overrides: Partial<CustomerRecord> = {}): Promise<CustomerRecord> => ({
  id: "cust_1",
  email: "guest@example.com",
  firstName: "Sara",
  lastName: "Ahmadi",
  passwordHash: await hashPassword("customer-password"),
  isActive: true,
  ...overrides,
});

describe("authorizeCustomer", () => {
  it("returns the authorized customer for valid credentials", async () => {
    const customer = await buildCustomer();
    const result = await authorizeCustomer(
      { email: "guest@example.com", password: "customer-password" },
      async () => customer
    );
    expect(result).toEqual({ id: "cust_1", email: "guest@example.com", name: "Sara Ahmadi" });
  });

  it("returns null for a wrong password", async () => {
    const customer = await buildCustomer();
    const result = await authorizeCustomer(
      { email: "guest@example.com", password: "wrong" },
      async () => customer
    );
    expect(result).toBeNull();
  });

  it("returns null when the customer is inactive", async () => {
    const customer = await buildCustomer({ isActive: false });
    const result = await authorizeCustomer(
      { email: "guest@example.com", password: "customer-password" },
      async () => customer
    );
    expect(result).toBeNull();
  });

  it("returns null when no customer is found", async () => {
    const result = await authorizeCustomer(
      { email: "missing@example.com", password: "customer-password" },
      async () => null
    );
    expect(result).toBeNull();
  });
});
