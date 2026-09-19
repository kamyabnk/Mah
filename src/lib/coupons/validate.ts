import type { Coupon, CouponAppliesTo, CouponType } from "@prisma/client";

export interface CartLineForCoupon {
  productId: string;
  categoryIds: string[];
  lineTotal: number;
}

export interface CouponValidationInput {
  coupon: Pick<
    Coupon,
    | "id"
    | "code"
    | "type"
    | "value"
    | "appliedTo"
    | "categoryId"
    | "productId"
    | "minOrderAmount"
    | "maxDiscountAmount"
    | "startsAt"
    | "endsAt"
    | "usageLimit"
    | "usedCount"
    | "isActive"
  >;
  subtotal: number;
  lines: CartLineForCoupon[];
  customerUsageCount: number;
  perCustomerLimit: number | null;
  now?: Date;
}

export type CouponValidationResult =
  | { ok: true; discount: number; couponId: string }
  | { ok: false; error: string };

function eligibleBase(appliedTo: CouponAppliesTo, categoryId: string | null, productId: string | null, subtotal: number, lines: CartLineForCoupon[]): number {
  if (appliedTo === "CATEGORY" && categoryId) {
    return lines.filter((l) => l.categoryIds.includes(categoryId)).reduce((sum, l) => sum + l.lineTotal, 0);
  }
  if (appliedTo === "PRODUCT" && productId) {
    return lines.filter((l) => l.productId === productId).reduce((sum, l) => sum + l.lineTotal, 0);
  }
  return subtotal;
}

function computeDiscount(type: CouponType, value: number, base: number, maxDiscountAmount: number | null): number {
  let discount = type === "PERCENTAGE" ? base * (value / 100) : value;
  if (maxDiscountAmount !== null) discount = Math.min(discount, maxDiscountAmount);
  return Math.min(Math.max(discount, 0), base);
}

export function validateCoupon(input: CouponValidationInput): CouponValidationResult {
  const { coupon, subtotal, lines, customerUsageCount, perCustomerLimit } = input;
  const now = input.now ?? new Date();

  if (!coupon.isActive) return { ok: false, error: "COUPON_INACTIVE" };
  if (coupon.startsAt && now < coupon.startsAt) return { ok: false, error: "COUPON_NOT_STARTED" };
  if (coupon.endsAt && now > coupon.endsAt) return { ok: false, error: "COUPON_EXPIRED" };
  if (coupon.minOrderAmount !== null && subtotal < Number(coupon.minOrderAmount)) {
    return { ok: false, error: "COUPON_MIN_ORDER_NOT_MET" };
  }
  if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
    return { ok: false, error: "COUPON_USAGE_LIMIT_REACHED" };
  }
  if (perCustomerLimit !== null && customerUsageCount >= perCustomerLimit) {
    return { ok: false, error: "COUPON_CUSTOMER_LIMIT_REACHED" };
  }

  const base = eligibleBase(coupon.appliedTo, coupon.categoryId, coupon.productId, subtotal, lines);
  if (base <= 0) return { ok: false, error: "COUPON_NOT_APPLICABLE" };

  const discount = computeDiscount(coupon.type, Number(coupon.value), base, coupon.maxDiscountAmount !== null ? Number(coupon.maxDiscountAmount) : null);
  if (discount <= 0) return { ok: false, error: "COUPON_NOT_APPLICABLE" };

  return { ok: true, discount: Math.round(discount), couponId: coupon.id };
}
