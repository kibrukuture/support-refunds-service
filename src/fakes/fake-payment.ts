import type { PaymentResult } from "../payments/types.js";

export interface FakePaymentRequest {
  readonly refundId: string;
  readonly orderId: string;
  readonly amount: number;
  readonly currency: string;
  readonly idempotencyKey?: string;
}

export class FakePaymentProvider {
  private readonly byKey = new Map<string, PaymentResult>();
  private counter = 0;

  readonly payments: PaymentResult[] = [];
  readonly requests: FakePaymentRequest[] = [];

  createRefund(request: FakePaymentRequest): PaymentResult {
    this.requests.push(request);

    const key = request.idempotencyKey;
    if (key !== undefined) {
      const existing = this.byKey.get(key);
      if (existing !== undefined) {
        return existing;
      }
    }

    const result: PaymentResult = {
      paymentId: `pay_${(this.counter += 1)}`,
      status: "succeeded",
    };

    if (key !== undefined) {
      this.byKey.set(key, result);
    }
    this.payments.push(result);
    return result;
  }
}

/** A fetch implementation that routes the payment client to the fake provider. */
export function fakePaymentsFetch(provider: FakePaymentProvider): typeof fetch {
  const handler = async (_input: Parameters<typeof fetch>[0], init?: RequestInit): Promise<Response> => {
    const headers = new Headers(init?.headers);
    const body = JSON.parse(String(init?.body ?? "{}")) as Record<string, unknown>;
    const idempotencyKey = headers.get("idempotency-key") ?? undefined;

    const result = provider.createRefund({
      refundId: String(body["refund_id"] ?? ""),
      orderId: String(body["order_id"] ?? ""),
      amount: Number(body["amount"] ?? 0),
      currency: String(body["currency"] ?? "usd"),
      ...(idempotencyKey === undefined ? {} : { idempotencyKey }),
    });

    return new Response(JSON.stringify({ id: result.paymentId, status: result.status }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  };
  return handler as unknown as typeof fetch;
}
