import type { ToolSchema } from "../model.js";
import { createRefund } from "./create-refund.js";
import { lookupOrder } from "./orders.js";
import { checkRefundStatus, listRefunds } from "./refunds.js";
import type { ToolDefinition } from "./types.js";
import { toSchema } from "./types.js";

export const tools: readonly ToolDefinition[] = [
  lookupOrder,
  checkRefundStatus,
  listRefunds,
  createRefund,
];

export function findTool(name: string): ToolDefinition | undefined {
  return tools.find((tool) => tool.name === name);
}

export function toolSchemas(): ToolSchema[] {
  return tools.map(toSchema);
}
