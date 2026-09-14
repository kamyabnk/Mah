import type {
  CreatePaymentInput,
  CreatePaymentResult,
  PaymentProvider,
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
}
