import type { ToolDefinition } from "./types.js";
import { requireNumber, requireString } from "./types.js";

export const createRefund: ToolDefinition = {
  name: "createRefund",
  description: "Create a refund for an order and send it to the payment worker.",
  parameters: {
    orderId: { type: "string", description: "The order to refund.", required: true },
    amount: { type: "number", description: "Refund amount in cents.", required: true },
    reason: { type: "string", description: "Why the refund is issued.", required: true },
  },
  async run({ store, queue }, input) {
    const orderId = requireString(input, "orderId");
    const amount = requireNumber(input, "amount");
    const reason = requireString(input, "reason");

    const order = await store.getOrder(orderId);
    if (order === null) {
      return { created: false, reason: "order not found" };
    }

    const refund = await store.createRefund({
      orderId: order.id,
      customerId: order.customerId,
      amountCents: amount,
      currency: order.currency,
      reason,
    });

    await queue.send(JSON.stringify({ refundId: refund.id }));

    return {
      created: true,
      refund: {
        id: refund.id,
        orderId: refund.orderId,
        amountCents: refund.amountCents,
        status: refund.status,
      },
    };
  },
};
