import assert from "node:assert/strict";
import { test } from "node:test";

import { FakePaymentProvider, fakePaymentsFetch } from "../src/fakes/fake-payment.js";
import { FakeQueue } from "../src/fakes/fake-queue.js";
import { HttpPaymentClient } from "../src/payments/client.js";
import type { PaymentClient, RefundRequest } from "../src/payments/types.js";
import { parseJob, processRefundMessage } from "../src/worker/refund-job.js";
import { REFUND_B, makeStore } from "./fixtures.js";

function jobBody(refundId: string): string {
  return JSON.stringify({ refundId });
}

test("pays a pending refund and removes the message", async () => {
  const store = makeStore();
  const provider = new FakePaymentProvider();
  const payments = new HttpPaymentClient("http://payments.test", fakePaymentsFetch(provider));
  const queue = new FakeQueue([jobBody(REFUND_B)]);

  const message = await queue.receive();
  assert.notEqual(message, null);
  await processRefundMessage({ store, payments, queue }, message!);

  const refund = await store.getRefund(REFUND_B);
  assert.equal(refund?.status, "succeeded");
  assert.equal(provider.payments.length, 1);
  assert.equal(queue.pending(), 0);
});

test("keeps extending message visibility while the payment call runs", async () => {
  const store = makeStore();
  const slowPayments: PaymentClient = {
    async createRefund(request: RefundRequest) {
      await new Promise((resolve) => setTimeout(resolve, 40));
      return { paymentId: `pay_${request.refundId}`, status: "succeeded" as const };
    },
  };
  const queue = new FakeQueue([jobBody(REFUND_B)]);

  const message = await queue.receive();
  await processRefundMessage(
    { store, payments: slowPayments, queue, heartbeat: { intervalMs: 5, extensionSeconds: 30 } },
    message!,
  );

  assert.ok(queue.visibilityCalls.length > 0);
  assert.equal(queue.visibilityCalls[0]?.seconds, 30);
});

test("drops a message whose refund no longer exists", async () => {
  const store = makeStore();
  const provider = new FakePaymentProvider();
  const payments = new HttpPaymentClient("http://payments.test", fakePaymentsFetch(provider));
  const queue = new FakeQueue([jobBody("00000000-0000-4000-8000-000000000000")]);

  const message = await queue.receive();
  await processRefundMessage({ store, payments, queue }, message!);

  assert.equal(provider.payments.length, 0);
  assert.equal(queue.pending(), 0);
});

test("parseJob rejects a body without a refund id", () => {
  assert.throws(() => parseJob("{}"), /refundId/);
  assert.throws(() => parseJob("not json"), /JSON/);
  assert.deepEqual(parseJob('{"refundId":"abc"}'), { refundId: "abc" });
});
