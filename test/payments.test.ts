import assert from "node:assert/strict";
import { test } from "node:test";

import { HttpPaymentClient } from "../src/payments/client.js";
import { FakePaymentProvider, fakePaymentsFetch } from "../src/fakes/fake-payment.js";

test("the provider returns the first payment for a repeated idempotency key", () => {
  const provider = new FakePaymentProvider();
  const request = {
    refundId: "refund-1",
    orderId: "order-1",
    amount: 4200,
    currency: "usd",
    idempotencyKey: "refund-refund-1",
  };

  const first = provider.createRefund(request);
  const second = provider.createRefund(request);

  assert.equal(second.paymentId, first.paymentId);
  assert.equal(provider.payments.length, 1);
});

test("the provider treats requests without a key as separate payments", () => {
  const provider = new FakePaymentProvider();
  const request = { refundId: "refund-1", orderId: "order-1", amount: 4200, currency: "usd" };

  const first = provider.createRefund(request);
  const second = provider.createRefund(request);

  assert.notEqual(second.paymentId, first.paymentId);
  assert.equal(provider.payments.length, 2);
});

test("the client posts a refund and returns the provider payment id", async () => {
  const provider = new FakePaymentProvider();
  const client = new HttpPaymentClient("http://payments.test", fakePaymentsFetch(provider));

  const result = await client.createRefund({
    refundId: "refund-1",
    orderId: "order-1",
    amount: 4200,
    currency: "usd",
  });

  assert.equal(result.status, "succeeded");
  assert.match(result.paymentId, /^pay_/);
  assert.equal(provider.requests.length, 1);
  assert.equal(provider.requests[0]?.amount, 4200);
});
