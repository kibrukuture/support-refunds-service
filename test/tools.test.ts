import assert from "node:assert/strict";
import { test } from "node:test";

import { checkRefundStatus, listRefunds } from "../src/api/agent/tools/refunds.js";
import { lookupOrder } from "../src/api/agent/tools/orders.js";
import { CUSTOMER_A, CUSTOMER_B, ORDER_A, ORDER_B, REFUND_A, REFUND_B, makeStore } from "./fixtures.js";

test("lookupOrder returns an order that belongs to the session customer", async () => {
  const result = await lookupOrder.run({ customerId: CUSTOMER_A, store: makeStore() }, { orderId: ORDER_A });
  assert.deepEqual(result, {
    found: true,
    order: {
      id: ORDER_A,
      status: "paid",
      amount: 4200,
      currency: "usd",
      createdAt: "2026-10-01T10:00:00.000Z",
    },
  });
});

test("lookupOrder hides an order that belongs to someone else", async () => {
  const result = await lookupOrder.run({ customerId: CUSTOMER_A, store: makeStore() }, { orderId: ORDER_B });
  assert.deepEqual(result, { found: false });
});

test("lookupOrder ignores a customer id supplied in the tool input", async () => {
  const result = await lookupOrder.run({ customerId: CUSTOMER_A, store: makeStore() }, {
    orderId: ORDER_B,
    customerId: CUSTOMER_B,
  });
  assert.deepEqual(result, { found: false });
});

test("checkRefundStatus hides a refund that belongs to someone else", async () => {
  const result = await checkRefundStatus.run({ customerId: CUSTOMER_A, store: makeStore() }, { refundId: REFUND_B });
  assert.deepEqual(result, { found: false });
});

test("checkRefundStatus returns a refund that belongs to the session customer", async () => {
  const result = await checkRefundStatus.run({ customerId: CUSTOMER_A, store: makeStore() }, { refundId: REFUND_A });
  assert.equal((result as { found: boolean }).found, true);
});

test("listRefunds returns only the session customer's refunds", async () => {
  const result = await listRefunds.run({ customerId: CUSTOMER_A, store: makeStore() }, { limit: 20 });
  const refunds = (result as { refunds: { id: string }[] }).refunds;
  assert.deepEqual(refunds.map((refund) => refund.id), [REFUND_A]);
});
