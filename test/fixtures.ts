import { FakeQueue } from "../src/fakes/fake-queue.js";
import { MemoryStore } from "../src/store/memory.js";
import type { Customer, Order, Refund } from "../src/types.js";

export const CUSTOMER_A = "11111111-1111-4111-8111-111111111111";
export const CUSTOMER_B = "22222222-2222-4222-8222-222222222222";

export const ORDER_A = "aaaaaaaa-1111-4111-8111-111111111111";
export const ORDER_B = "bbbbbbbb-2222-4222-8222-222222222222";

export const REFUND_A = "cccccccc-1111-4111-8111-111111111111";
export const REFUND_B = "dddddddd-2222-4222-8222-222222222222";

export const SESSION_A = "session-ada";
export const SESSION_B = "session-grace";

const customers: Customer[] = [
  { id: CUSTOMER_A, email: "ada@example.test" },
  { id: CUSTOMER_B, email: "grace@example.test" },
];

const orders: Order[] = [
  {
    id: ORDER_A,
    customerId: CUSTOMER_A,
    amount: 4200,
    currency: "usd",
    status: "paid",
    createdAt: "2026-10-01T10:00:00.000Z",
  },
  {
    id: ORDER_B,
    customerId: CUSTOMER_B,
    amount: 9900,
    currency: "usd",
    status: "paid",
    createdAt: "2026-10-02T10:00:00.000Z",
  },
];

const refunds: Refund[] = [
  {
    id: REFUND_A,
    orderId: ORDER_A,
    customerId: CUSTOMER_A,
    amountCents: 4200,
    currency: "usd",
    status: "succeeded",
    reason: "damaged item",
    createdAt: "2026-10-03T10:00:00.000Z",
  },
  {
    id: REFUND_B,
    orderId: ORDER_B,
    customerId: CUSTOMER_B,
    amountCents: 9900,
    currency: "usd",
    status: "pending",
    reason: "changed mind",
    createdAt: "2026-10-04T10:00:00.000Z",
  },
];

export interface TestToolContext {
  readonly customerId: string;
  readonly store: MemoryStore;
  readonly queue: FakeQueue;
}

export function toolContext(customerId: string): TestToolContext {
  return { customerId, store: makeStore(), queue: new FakeQueue() };
}

export function makeStore(): MemoryStore {
  return new MemoryStore({
    customers,
    orders,
    refunds,
    sessions: { [SESSION_A]: CUSTOMER_A, [SESSION_B]: CUSTOMER_B },
  });
}
