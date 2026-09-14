import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
  RefundInput,
  RefundResult,
  VerifyCallbackInput,
  VerifyCallbackResult,
} from "./payment-provider";

export class ManualPaymentProvider implements PaymentProvider {
  readonly key = "manual";

  async createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult> {
    return {
      redirectUrl: null,
      providerRef: `manual_${input.idempotencyKey}`,
      status: "PENDING",
    };
  }

  async verifyCallback(_input: VerifyCallbackInput): Promise<VerifyCallbackResult> {
    throw new Error(
      "ManualPaymentProvider has no callback flow: mark the order paid explicitly via the admin order action."
    );
  }

  async refund(_input: RefundInput): Promise<RefundResult> {
    throw new Error(
      "ManualPaymentProvider has no automated refund flow: process the refund manually and update the order/payment status via the admin action."
    );
  }
}
