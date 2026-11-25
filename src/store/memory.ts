import type { Customer, Order, Refund, RefundStatus } from "../types.js";
import type { Store } from "./types.js";

interface MemoryData {
  readonly customers?: readonly Customer[];
  readonly sessions?: Readonly<Record<string, string>>;
  readonly orders?: readonly Order[];
  readonly refunds?: readonly Refund[];
}

export class MemoryStore implements Store {
  private readonly customers = new Map<string, Customer>();
  private readonly sessions = new Map<string, string>();
  private readonly orders = new Map<string, Order>();
  private readonly refunds = new Map<string, Refund>();

  constructor(data: MemoryData = {}) {
    for (const customer of data.customers ?? []) {
      this.customers.set(customer.id, customer);
    }
    for (const [token, customerId] of Object.entries(data.sessions ?? {})) {
      this.sessions.set(token, customerId);
    }
    for (const order of data.orders ?? []) {
      this.orders.set(order.id, order);
    }
    for (const refund of data.refunds ?? []) {
      this.refunds.set(refund.id, refund);
    }
  }

  async findCustomerBySession(token: string): Promise<string | null> {
    return this.sessions.get(token) ?? null;
  }

  async getCustomer(customerId: string): Promise<Customer | null> {
    return this.customers.get(customerId) ?? null;
  }

  async getOrder(orderId: string): Promise<Order | null> {
    return this.orders.get(orderId) ?? null;
  }

  async getOrderForCustomer(orderId: string, customerId: string): Promise<Order | null> {
    const order = this.orders.get(orderId);
    if (!order || order.customerId !== customerId) {
      return null;
    }
    return order;
  }

  async getRefund(refundId: string): Promise<Refund | null> {
    return this.refunds.get(refundId) ?? null;
  }

  async getRefundForCustomer(refundId: string, customerId: string): Promise<Refund | null> {
    const refund = this.refunds.get(refundId);
    if (!refund || refund.customerId !== customerId) {
      return null;
    }
    return refund;
  }

  async listRefunds(customerId: string, limit: number): Promise<Refund[]> {
    return [...this.refunds.values()]
      .filter((refund) => refund.customerId === customerId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, limit);
  }

  async updateRefundStatus(refundId: string, status: RefundStatus): Promise<void> {
    const refund = this.refunds.get(refundId);
    if (!refund) {
      return;
    }
    this.refunds.set(refundId, { ...refund, status });
  }

  addRefund(refund: Refund): void {
    this.refunds.set(refund.id, refund);
  }
}
