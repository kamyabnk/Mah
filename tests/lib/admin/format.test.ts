import { describe, expect, it } from "vitest";
import { formatMoney, localised, toNullableNumber, toNumber } from "@/lib/admin/format";

/** Stand-in for a Prisma Decimal, which reaches the UI as an object. */
const decimal = (value: string) => ({ toString: () => value });

describe("toNumber", () => {
  it("converts a Decimal-like object", () => {
    expect(toNumber(decimal("425000"))).toBe(425000);
  });

  it("passes a plain number through", () => {
    expect(toNumber(12)).toBe(12);
  });

  it("treats null and undefined as zero so sums do not become NaN", () => {
    expect(toNumber(null)).toBe(0);
    expect(toNumber(undefined)).toBe(0);
  });

  it("falls back to zero for an unparseable value", () => {
    expect(toNumber(decimal("not-a-number"))).toBe(0);
  });
});

describe("toNullableNumber", () => {
  it("keeps null distinct from zero, which salePrice depends on", () => {
    expect(toNullableNumber(null)).toBeNull();
    expect(toNullableNumber(decimal("0"))).toBe(0);
  });
});

describe("formatMoney", () => {
  it("groups English digits and drops decimals", () => {
    expect(formatMoney(425000, "en")).toBe("425,000");
  });

  it("renders Persian digits for the fa locale", () => {
    const formatted = formatMoney(425000, "fa");
    expect(formatted).toMatch(/[۰-۹]/);
    expect(formatted).not.toMatch(/[0-9]/);
  });
});

describe("localised", () => {
  it("picks the Persian value for fa", () => {
    expect(localised("fa", "Amber", "کهربا")).toBe("کهربا");
  });

  it("picks the English value for en", () => {
    expect(localised("en", "Amber", "کهربا")).toBe("Amber");
  });
});
