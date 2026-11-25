import type pg from "pg";

import type { Currency, Customer, Order, OrderStatus, Refund, RefundStatus } from "../types.js";
import type { CreateRefundInput, RefundQuery, Store } from "./types.js";

interface CustomerRow {
  readonly id: string;
  readonly email: string;
}

interface OrderRow {
  readonly id: string;
  readonly customer_id: string;
  readonly amount: number;
  readonly currency: string;
  readonly status: string;
  readonly created_at: Date;
}

interface RefundRow {
  readonly id: string;
  readonly order_id: string;
  readonly customer_id: string;
  readonly amount_cents: number;
  readonly currency: string;
  readonly status: string;
  readonly reason: string;
  readonly created_at: Date;
}

const REFUND_SORT_COLUMNS: Readonly<Record<string, string>> = {
  created_at: "created_at",
  amount: "amount_cents",
};
const DEFAULT_SORT_COLUMN = "created_at";

const ORDER_COLUMNS = "id, customer_id, amount, currency, status, created_at";
const REFUND_COLUMNS = "id, order_id, customer_id, amount_cents, currency, status, reason, created_at";

export class PgStore implements Store {
  constructor(private readonly pool: pg.Pool) {}

  async findCustomerBySession(token: string): Promise<string | null> {
    const result = await this.pool.query<{ customer_id: string }>(
      `SELECT customer_id FROM sessions WHERE token = $1 AND expires_at > now()`,
      [token],
    );
    return result.rows[0]?.customer_id ?? null;
  }

  async getCustomer(customerId: string): Promise<Customer | null> {
    const result = await this.pool.query<CustomerRow>(
      `SELECT id, email FROM customers WHERE id = $1`,
      [customerId],
    );
    const row = result.rows[0];
    return row ? { id: row.id, email: row.email } : null;
  }

  async getOrder(orderId: string): Promise<Order | null> {
    const result = await this.pool.query<OrderRow>(
      `SELECT ${ORDER_COLUMNS} FROM orders WHERE id = $1`,
      [orderId],
    );
    const row = result.rows[0];
    return row ? toOrder(row) : null;
  }

  async getOrderForCustomer(orderId: string, customerId: string): Promise<Order | null> {
    const result = await this.pool.query<OrderRow>(
      `SELECT ${ORDER_COLUMNS} FROM orders WHERE id = $1 AND customer_id = $2`,
      [orderId, customerId],
    );
    const row = result.rows[0];
    return row ? toOrder(row) : null;
  }

  async getRefund(refundId: string): Promise<Refund | null> {
    const result = await this.pool.query<RefundRow>(
      `SELECT ${REFUND_COLUMNS} FROM refunds WHERE id = $1`,
      [refundId],
    );
    const row = result.rows[0];
    return row ? toRefund(row) : null;
  }

  async getRefundForCustomer(refundId: string, customerId: string): Promise<Refund | null> {
    const result = await this.pool.query<RefundRow>(
      `SELECT ${REFUND_COLUMNS} FROM refunds WHERE id = $1 AND customer_id = $2`,
      [refundId, customerId],
    );
    const row = result.rows[0];
    return row ? toRefund(row) : null;
  }

  async listRefunds(customerId: string, query: RefundQuery): Promise<Refund[]> {
    const column = REFUND_SORT_COLUMNS[query.sort] ?? DEFAULT_SORT_COLUMN;
    const direction = query.direction === "asc" ? "ASC" : "DESC";
    const limit = Math.min(Math.max(Math.trunc(query.limit), 1), 50);

    const result = await this.pool.query<RefundRow>(
      `SELECT ${REFUND_COLUMNS}
         FROM refunds
        WHERE customer_id = $1
        ORDER BY ${column} ${direction}
        LIMIT $2`,
      [customerId, limit],
    );
    return result.rows.map(toRefund);
  }

  async createRefund(input: CreateRefundInput): Promise<Refund> {
    const result = await this.pool.query<RefundRow>(
      `INSERT INTO refunds (order_id, customer_id, amount_cents, currency, reason)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${REFUND_COLUMNS}`,
      [input.orderId, input.customerId, input.amountCents, input.currency, input.reason],
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("refund insert returned no row");
    }
    return toRefund(row);
  }

  async updateRefundStatus(refundId: string, status: RefundStatus): Promise<void> {
    await this.pool.query(`UPDATE refunds SET status = $2 WHERE id = $1`, [refundId, status]);
  }
}

function toOrder(row: OrderRow): Order {
  return {
    id: row.id,
    customerId: row.customer_id,
    amount: row.amount,
    currency: row.currency as Currency,
    status: row.status as OrderStatus,
    createdAt: row.created_at.toISOString(),
  };
}

function toRefund(row: RefundRow): Refund {
  return {
    id: row.id,
    orderId: row.order_id,
    customerId: row.customer_id,
    amountCents: row.amount_cents,
    currency: row.currency as Currency,
    status: row.status as RefundStatus,
    reason: row.reason,
    createdAt: row.created_at.toISOString(),
  };
}
