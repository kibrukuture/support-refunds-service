import { config } from "../config.js";
import type { PaymentClient, PaymentResult, RefundRequest } from "./types.js";

export class PaymentError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "PaymentError";
  }
}

interface RefundResponse {
  readonly id: string;
  readonly status: "succeeded" | "pending";
}

/**
 * Client for the payment provider described in docs/payment-contract.md.
 */
export class HttpPaymentClient implements PaymentClient {
  constructor(
    private readonly baseUrl: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async createRefund(request: RefundRequest): Promise<PaymentResult> {
    const response = await this.fetchImpl(`${this.baseUrl}/v1/refunds`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "idempotency-key": idempotencyKeyFor(request.refundId),
      },
      body: JSON.stringify({
        refund_id: request.refundId,
        order_id: request.orderId,
        amount: request.amount,
        currency: request.currency,
      }),
      signal: AbortSignal.timeout(config.payments.timeoutMs),
    });

    if (!response.ok) {
      throw new PaymentError(`payment provider returned ${response.status}`, response.status);
    }

    const body = (await response.json()) as RefundResponse;
    return { paymentId: body.id, status: body.status };
  }
}

export function idempotencyKeyFor(refundId: string): string {
  return `refund-${refundId}`;
}
