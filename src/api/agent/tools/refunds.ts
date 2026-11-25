import type { ToolDefinition } from "./types.js";
import { optionalNumber, requireString } from "./types.js";

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

export const checkRefundStatus: ToolDefinition = {
  name: "checkRefundStatus",
  description: "Read the status of one refund that belongs to the signed-in customer.",
  parameters: {
    refundId: { type: "string", description: "The refund identifier.", required: true },
  },
  async run({ customerId, store }, input) {
    const refundId = requireString(input, "refundId");
    const refund = await store.getRefundForCustomer(refundId, customerId);
    if (!refund) {
      return { found: false };
    }
    return {
      found: true,
      refund: {
        id: refund.id,
        orderId: refund.orderId,
        status: refund.status,
        amount: refund.amountCents,
        currency: refund.currency,
        createdAt: refund.createdAt,
      },
    };
  },
};

export const listRefunds: ToolDefinition = {
  name: "listRefunds",
  description: "List recent refunds that belong to the signed-in customer.",
  parameters: {
    limit: { type: "number", description: "How many refunds to return, 1 to 20.", required: false },
  },
  async run({ customerId, store }, input) {
    const requested = optionalNumber(input, "limit") ?? DEFAULT_LIMIT;
    const limit = Math.min(Math.max(Math.trunc(requested), 1), MAX_LIMIT);
    const refunds = await store.listRefunds(customerId, limit);
    return {
      refunds: refunds.map((refund) => ({
        id: refund.id,
        orderId: refund.orderId,
        status: refund.status,
        amount: refund.amountCents,
        currency: refund.currency,
        createdAt: refund.createdAt,
      })),
    };
  },
};
