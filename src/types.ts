export type Currency = "usd";

export type OrderStatus = "paid" | "partially_refunded" | "refunded";

export type RefundStatus = "pending" | "processing" | "succeeded" | "failed";

export interface Customer {
  readonly id: string;
  readonly email: string;
}

export interface Order {
  readonly id: string;
  readonly customerId: string;
  /** Stored in cents. */
  readonly amount: number;
  readonly currency: Currency;
  readonly status: OrderStatus;
  readonly createdAt: string;
}

export interface Refund {
  readonly id: string;
  readonly orderId: string;
  readonly customerId: string;
  /** Stored in cents. */
  readonly amountCents: number;
  readonly currency: Currency;
  readonly status: RefundStatus;
  readonly reason: string;
  readonly createdAt: string;
}

export interface RefundJob {
  readonly refundId: string;
}
