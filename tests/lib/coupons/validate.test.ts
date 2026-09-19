import { describe, expect, it } from "vitest";
import { validateCoupon, type CouponValidationInput } from "@/lib/coupons/validate";

function baseCoupon(overrides: Partial<CouponValidationInput["coupon"]> = {}): CouponValidationInput["coupon"] {
  return {
    id: "coupon_1",
    code: "SAVE10",
    type: "PERCENTAGE",
    value: 10 as unknown as never,
    appliedTo: "ALL",
    categoryId: null,
    productId: null,
    minOrderAmount: null,
    maxDiscountAmount: null,
    startsAt: null,
    endsAt: null,
    usageLimit: null,
    usedCount: 0,
    isActive: true,
    ...overrides,
  } as CouponValidationInput["coupon"];
}

const lines = [{ productId: "p1", categoryIds: ["cat1"], lineTotal: 500000 }];

describe("validateCoupon", () => {
  it("applies a percentage discount to the full subtotal", () => {
    const result = validateCoupon({
      coupon: baseCoupon(),
      subtotal: 500000,
      lines,
      customerUsageCount: 0,
      perCustomerLimit: null,
    });
    expect(result).toEqual({ ok: true, discount: 50000, couponId: "coupon_1" });
  });

  it("rejects an inactive coupon", () => {
    const result = validateCoupon({
      coupon: baseCoupon({ isActive: false }),
      subtotal: 500000,
      lines,
      customerUsageCount: 0,
      perCustomerLimit: null,
    });
    expect(result.ok).toBe(false);
  });

  it("rejects when below minOrderAmount", () => {
    const result = validateCoupon({
      coupon: baseCoupon({ minOrderAmount: 1000000 as unknown as never }),
      subtotal: 500000,
      lines,
      customerUsageCount: 0,
      perCustomerLimit: null,
    });
    expect(result).toEqual({ ok: false, error: "COUPON_MIN_ORDER_NOT_MET" });
  });

  it("rejects when usage limit reached", () => {
    const result = validateCoupon({
      coupon: baseCoupon({ usageLimit: 5, usedCount: 5 }),
      subtotal: 500000,
      lines,
      customerUsageCount: 0,
      perCustomerLimit: null,
    });
    expect(result).toEqual({ ok: false, error: "COUPON_USAGE_LIMIT_REACHED" });
  });

  it("rejects when per-customer limit reached", () => {
    const result = validateCoupon({
      coupon: baseCoupon(),
      subtotal: 500000,
      lines,
      customerUsageCount: 2,
      perCustomerLimit: 2,
    });
    expect(result).toEqual({ ok: false, error: "COUPON_CUSTOMER_LIMIT_REACHED" });
  });

  it("caps a percentage discount at maxDiscountAmount", () => {
    const result = validateCoupon({
      coupon: baseCoupon({ value: 50 as unknown as never, maxDiscountAmount: 100000 as unknown as never }),
      subtotal: 1000000,
      lines: [{ productId: "p1", categoryIds: [], lineTotal: 1000000 }],
      customerUsageCount: 0,
      perCustomerLimit: null,
    });
    expect(result).toEqual({ ok: true, discount: 100000, couponId: "coupon_1" });
  });

  it("scopes a CATEGORY coupon to only matching cart lines", () => {
    const result = validateCoupon({
      coupon: baseCoupon({ appliedTo: "CATEGORY", categoryId: "cat1" }),
      subtotal: 800000,
      lines: [
        { productId: "p1", categoryIds: ["cat1"], lineTotal: 500000 },
        { productId: "p2", categoryIds: ["cat2"], lineTotal: 300000 },
      ],
      customerUsageCount: 0,
      perCustomerLimit: null,
    });
    expect(result).toEqual({ ok: true, discount: 50000, couponId: "coupon_1" });
  });

  it("rejects a CATEGORY coupon when the cart has no matching category", () => {
    const result = validateCoupon({
      coupon: baseCoupon({ appliedTo: "CATEGORY", categoryId: "cat-nomatch" }),
      subtotal: 500000,
      lines,
      customerUsageCount: 0,
      perCustomerLimit: null,
    });
    expect(result).toEqual({ ok: false, error: "COUPON_NOT_APPLICABLE" });
  });

  it("never discounts more than the eligible base (FIXED larger than subtotal)", () => {
    const result = validateCoupon({
      coupon: baseCoupon({ type: "FIXED", value: 999999 as unknown as never }),
      subtotal: 100000,
      lines: [{ productId: "p1", categoryIds: [], lineTotal: 100000 }],
      customerUsageCount: 0,
      perCustomerLimit: null,
    });
    expect(result).toEqual({ ok: true, discount: 100000, couponId: "coupon_1" });
  });

  it("rejects when now is before startsAt", () => {
    const future = new Date(Date.now() + 86400000);
    const result = validateCoupon({
      coupon: baseCoupon({ startsAt: future }),
      subtotal: 500000,
      lines,
      customerUsageCount: 0,
      perCustomerLimit: null,
    });
    expect(result).toEqual({ ok: false, error: "COUPON_NOT_STARTED" });
  });

  it("rejects when now is after endsAt", () => {
    const past = new Date(Date.now() - 86400000);
    const result = validateCoupon({
      coupon: baseCoupon({ endsAt: past }),
      subtotal: 500000,
      lines,
      customerUsageCount: 0,
      perCustomerLimit: null,
    });
    expect(result).toEqual({ ok: false, error: "COUPON_EXPIRED" });
  });
});
