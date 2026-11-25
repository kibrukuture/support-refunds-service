import assert from "node:assert/strict";
import { test } from "node:test";
import type { AddressInfo } from "node:net";

import { createApp } from "../src/api/server.js";
import { ScriptedModel, textReply, toolCall, toolReply } from "../src/fakes/fake-model.js";
import { SESSION_A, SESSION_B, CUSTOMER_A, ORDER_A, makeStore } from "./fixtures.js";

async function withServer<T>(model: ScriptedModel, run: (baseUrl: string) => Promise<T>): Promise<T> {
  const server = createApp({ store: makeStore(), model });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const { port } = server.address() as AddressInfo;
  try {
    return await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

test("health check", async () => {
  await withServer(new ScriptedModel([]), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
  });
});

test("chat requires a session", async () => {
  await withServer(new ScriptedModel([]), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "hello" }),
    });
    assert.equal(response.status, 401);
  });
});

test("chat runs the agent for the signed-in customer", async () => {
  const model = new ScriptedModel([
    toolReply([toolCall("lookupOrder", { orderId: ORDER_A })]),
    textReply("It shipped today."),
  ]);

  await withServer(model, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/chat`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${SESSION_A}` },
      body: JSON.stringify({ message: "where is my order" }),
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as { reply: string; toolCalls: string[] };
    assert.equal(body.reply, "It shipped today.");
    assert.deepEqual(body.toolCalls, ["lookupOrder"]);
  });
});

test("the refund list is scoped to the session customer", async () => {
  await withServer(new ScriptedModel([]), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/refunds`, {
      headers: { authorization: `Bearer ${SESSION_B}` },
    });
    assert.equal(response.status, 200);
    const body = (await response.json()) as { refunds: { id: string }[] };
    assert.equal(body.refunds.length, 1);
    assert.equal(body.refunds[0]?.id, "dddddddd-2222-4222-8222-222222222222");
  });
});

test("an unknown session is rejected", async () => {
  assert.notEqual(SESSION_A, SESSION_B);
  assert.notEqual(CUSTOMER_A, "");
  await withServer(new ScriptedModel([]), async (baseUrl) => {
    const response = await fetch(`${baseUrl}/refunds`, {
      headers: { authorization: "Bearer nope" },
    });
    assert.equal(response.status, 401);
  });
});
