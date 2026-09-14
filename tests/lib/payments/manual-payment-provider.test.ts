import { describe, expect, it } from "vitest";
import { ManualPaymentProvider } from "@/lib/payments/manual-payment-provider";

describe("ManualPaymentProvider", () => {
  const provider = new ManualPaymentProvider();

  it("has the provider key 'manual'", () => {
    expect(provider.key).toBe("manual");
  });

  it("creates a payment that stays PENDING with no redirect", async () => {
    const result = await provider.createPayment({
      orderId: "order_1",
      amount: 250000,
      currency: "IRT",
      idempotencyKey: "idem_1",
      callbackUrl: "https://mahcandle.test/checkout/callback",
    });
    expect(result.status).toBe("PENDING");
    expect(result.redirectUrl).toBeNull();
    expect(result.providerRef).toContain("idem_1");
  });

  it("never auto-succeeds a callback — verifyCallback is unsupported", async () => {
    await expect(provider.verifyCallback({ query: {} })).rejects.toThrow(
      /no callback flow/i
    );
  });

  it("never auto-succeeds a refund — refund is unsupported", async () => {
    await expect(
      provider.refund({
        orderId: "order_1",
        paymentId: "pay_1",
        amount: 250000,
      })
    ).rejects.toThrow(/no automated refund flow/i);
  });
});
