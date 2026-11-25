import type { Customer, Order, Refund, RefundStatus } from "../types.js";

export interface CreateRefundInput {
  readonly orderId: string;
  readonly customerId: string;
  readonly amountCents: number;
  readonly currency: string;
  readonly reason: string;
}

export interface Store {
  findCustomerBySession(token: string): Promise<string | null>;
  getCustomer(customerId: string): Promise<Customer | null>;
  getOrder(orderId: string): Promise<Order | null>;
  getOrderForCustomer(orderId: string, customerId: string): Promise<Order | null>;
  getRefund(refundId: string): Promise<Refund | null>;
  getRefundForCustomer(refundId: string, customerId: string): Promise<Refund | null>;
  listRefunds(customerId: string, limit: number): Promise<Refund[]>;
  createRefund(input: CreateRefundInput): Promise<Refund>;
  updateRefundStatus(refundId: string, status: RefundStatus): Promise<void>;
}
