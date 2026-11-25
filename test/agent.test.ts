import assert from "node:assert/strict";
import { test } from "node:test";

import { runAgent } from "../src/api/agent/agent.js";
import { ScriptedModel, textReply, toolCall, toolReply } from "../src/fakes/fake-model.js";
import { CUSTOMER_A, CUSTOMER_B, ORDER_A, ORDER_B, makeStore } from "./fixtures.js";

test("runs a tool call and returns the model's final reply", async () => {
  const model = new ScriptedModel([
    toolReply([toolCall("lookupOrder", { orderId: ORDER_A })]),
    textReply("Your order is paid and was 42.00 USD."),
  ]);

  const result = await runAgent({ model, store: makeStore() }, { customerId: CUSTOMER_A }, "Where is my order?");

  assert.equal(result.reply, "Your order is paid and was 42.00 USD.");
  assert.deepEqual(result.toolCalls.map((call) => call.name), ["lookupOrder"]);
  assert.equal(model.requests.length, 2);

  const toolMessage = model.requests[1]?.messages.at(-1);
  assert.equal(toolMessage?.role, "tool");
  assert.match(toolMessage?.content ?? "", /"found":true/);
});

test("the session customer scopes tool results, not the tool arguments", async () => {
  const model = new ScriptedModel([
    toolReply([toolCall("lookupOrder", { orderId: ORDER_B, customerId: CUSTOMER_B })]),
    textReply("I could not find that order."),
  ]);

  await runAgent({ model, store: makeStore() }, { customerId: CUSTOMER_A }, "Look at order b");

  const toolMessage = model.requests[1]?.messages.at(-1);
  assert.match(toolMessage?.content ?? "", /"found":false/);
});

test("an unknown tool is reported back to the model instead of crashing", async () => {
  const model = new ScriptedModel([
    toolReply([toolCall("deleteAccount", {})]),
    textReply("I cannot do that."),
  ]);

  const result = await runAgent({ model, store: makeStore() }, { customerId: CUSTOMER_A }, "delete my account");

  assert.equal(result.reply, "I cannot do that.");
  const toolMessage = model.requests[1]?.messages.at(-1);
  assert.match(toolMessage?.content ?? "", /unknown tool/);
});
