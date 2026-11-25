export interface RefundRequest {
  readonly refundId: string;
  readonly orderId: string;
  readonly amount: number;
  readonly currency: string;
}

export interface PaymentResult {
  readonly paymentId: string;
  readonly status: "succeeded" | "pending";
}

export interface PaymentClient {
  createRefund(request: RefundRequest): Promise<PaymentResult>;
}
