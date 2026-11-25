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

interface RefundPayload {
  readonly refund_id: string;
  readonly order_id: string;
  readonly amount: number;
  readonly currency: string;
}

/**
 * Client for the payment provider described in docs/payment-contract.md.
 */
export class HttpPaymentClient implements PaymentClient {
  private readonly endpoint: string;

  constructor(
    baseUrl: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.endpoint = `${baseUrl}/v1/refunds`;
  }

  async createRefund(request: RefundRequest): Promise<PaymentResult> {
    const payload: RefundPayload = {
      refund_id: request.refundId,
      order_id: request.orderId,
      amount: request.amount,
      currency: request.currency,
    };

    const response = await this.fetchImpl(this.endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(config.payments.timeoutMs),
    });

    if (!response.ok) {
      throw new PaymentError(`payment provider returned ${response.status}`, response.status);
    }

    return toPaymentResult((await response.json()) as RefundResponse);
  }
}

function toPaymentResult(body: RefundResponse): PaymentResult {
  return { paymentId: body.id, status: body.status };
}
