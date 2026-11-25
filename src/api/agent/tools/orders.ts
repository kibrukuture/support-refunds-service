import type { ToolDefinition } from "./types.js";
import { requireString } from "./types.js";

export const lookupOrder: ToolDefinition = {
  name: "lookupOrder",
  description: "Look up one order that belongs to the signed-in customer.",
  parameters: {
    orderId: { type: "string", description: "The order identifier.", required: true },
  },
  async run({ customerId, store }, input) {
    const orderId = requireString(input, "orderId");
    const order = await store.getOrderForCustomer(orderId, customerId);
    if (!order) {
      return { found: false };
    }
    return {
      found: true,
      order: {
        id: order.id,
        status: order.status,
        amount: order.amount,
        currency: order.currency,
        createdAt: order.createdAt,
      },
    };
  },
};
