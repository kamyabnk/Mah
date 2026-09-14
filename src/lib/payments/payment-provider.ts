export interface CreatePaymentInput {
  orderId: string;
  amount: number;
  currency: string;
  idempotencyKey: string;
  callbackUrl: string;
}

export interface CreatePaymentResult {
  redirectUrl: string | null;
  providerRef: string;
  status: "PENDING";
}

export interface VerifyCallbackInput {
  query: Record<string, string | string[] | undefined>;
}

export interface VerifyCallbackResult {
  providerRef: string;
  status: "SUCCEEDED" | "FAILED";
  rawPayload: Record<string, unknown>;
}

export interface RefundInput {
  orderId: string;
  paymentId: string;
  amount: number;
  reason?: string;
}

export interface RefundResult {
  status: "FAILED";
  reason: string;
}

export interface PaymentProvider {
  readonly key: string;
  createPayment(input: CreatePaymentInput): Promise<CreatePaymentResult>;
  verifyCallback(input: VerifyCallbackInput): Promise<VerifyCallbackResult>;
  refund(input: RefundInput): Promise<RefundResult>;
}
