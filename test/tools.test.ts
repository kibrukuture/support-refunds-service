import assert from "node:assert/strict";
import { test } from "node:test";

import { createRefund } from "../src/api/agent/tools/create-refund.js";
import { lookupOrder } from "../src/api/agent/tools/orders.js";
import { checkRefundStatus, listRefunds } from "../src/api/agent/tools/refunds.js";
import {
  CUSTOMER_A,
  CUSTOMER_B,
  ORDER_A,
  ORDER_B,
  REFUND_A,
  REFUND_B,
  toolContext,
} from "./fixtures.js";

test("lookupOrder returns an order that belongs to the session customer", async () => {
  const result = await lookupOrder.run(toolContext(CUSTOMER_A), { orderId: ORDER_A });
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
  const result = await lookupOrder.run(toolContext(CUSTOMER_A), { orderId: ORDER_B });
  assert.deepEqual(result, { found: false });
});

test("lookupOrder ignores a customer id supplied in the tool input", async () => {
  const result = await lookupOrder.run(toolContext(CUSTOMER_A), {
    orderId: ORDER_B,
    customerId: CUSTOMER_B,
  });
  assert.deepEqual(result, { found: false });
});

test("checkRefundStatus hides a refund that belongs to someone else", async () => {
  const result = await checkRefundStatus.run(toolContext(CUSTOMER_A), { refundId: REFUND_B });
  assert.deepEqual(result, { found: false });
});

test("checkRefundStatus returns a refund that belongs to the session customer", async () => {
  const context = toolContext(CUSTOMER_A);
  const result = await checkRefundStatus.run(context, { refundId: REFUND_A });
  const body = result as { found: boolean; refund: { amount: number } };
  assert.equal(body.found, true);
  assert.equal(body.refund.amount, 4200);
});

test("listRefunds returns only the session customer's refunds", async () => {
  const result = await listRefunds.run(toolContext(CUSTOMER_A), { limit: 20 });
  const refunds = (result as { refunds: { id: string }[] }).refunds;
  assert.deepEqual(refunds.map((refund) => refund.id), [REFUND_A]);
});

test("listRefunds accepts a sort key and direction", async () => {
  const result = await listRefunds.run(toolContext(CUSTOMER_A), {
    limit: 20,
    sort: "amount",
    direction: "asc",
  });
  const refunds = (result as { refunds: { id: string }[] }).refunds;
  assert.equal(refunds.length, 1);
});

test("createRefund stores a pending refund and queues a job", async () => {
  const context = toolContext(CUSTOMER_A);
  const result = await createRefund.run(context, {
    orderId: ORDER_A,
    amount: 4200,
    reason: "damaged on arrival",
  });

  const body = result as { created: boolean; refund: { status: string; amountCents: number } };
  assert.equal(body.created, true);
  assert.equal(body.refund.status, "pending");
  assert.equal(body.refund.amountCents, 4200);

  const refunds = await context.store.listRefunds(CUSTOMER_A, { sort: "created_at", direction: "desc", limit: 10 });
  assert.equal(refunds.length, 2);
  assert.equal(context.queue.pending(), 1);
});
