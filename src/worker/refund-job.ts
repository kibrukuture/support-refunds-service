import { config } from "../config.js";
import { log } from "../logger.js";
import type { PaymentClient } from "../payments/types.js";
import type { Queue, QueueMessage } from "../queue/types.js";
import type { Store } from "../store/types.js";
import type { RefundJob } from "../types.js";
import { withVisibilityHeartbeat } from "./visibility.js";

export interface WorkerDeps {
  readonly store: Store;
  readonly payments: PaymentClient;
  readonly queue: Queue;
  /** Overrides the queue heartbeat timings. Used by tests. */
  readonly heartbeat?: { readonly intervalMs: number; readonly extensionSeconds: number };
}

export async function processRefundMessage(deps: WorkerDeps, message: QueueMessage): Promise<void> {
  const job = parseJob(message.body);
  const refund = await deps.store.getRefund(job.refundId);

  if (refund === null) {
    log("warn", "refund not found for job", { refundId: job.refundId, messageId: message.id });
    await deps.queue.delete(message.receiptHandle);
    return;
  }

  if (refund.status === "succeeded") {
    log("info", "refund already paid", { refundId: refund.id });
    await deps.queue.delete(message.receiptHandle);
    return;
  }

  await deps.store.updateRefundStatus(refund.id, "processing");

  try {
    await withVisibilityHeartbeat(
      deps.queue,
      message,
      async () => {
        const payment = await deps.payments.createRefund({
          refundId: refund.id,
          orderId: refund.orderId,
          amount: refund.amount,
          currency: refund.currency,
        });
        await deps.store.updateRefundStatus(refund.id, "succeeded");
        log("info", "refund paid", { refundId: refund.id, paymentId: payment.paymentId });
      },
      {
        intervalMs: deps.heartbeat?.intervalMs ?? config.queue.heartbeatIntervalMs,
        extensionSeconds: deps.heartbeat?.extensionSeconds ?? config.queue.visibilityTimeoutSeconds,
      },
    );
    await deps.queue.delete(message.receiptHandle);
  } catch (error) {
    await deps.store.updateRefundStatus(refund.id, "failed");
    throw error;
  }
}

export function parseJob(body: string): RefundJob {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new Error("refund job is not valid JSON");
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("refund job must be an object");
  }
  const refundId = (parsed as Record<string, unknown>)["refundId"];
  if (typeof refundId !== "string" || refundId.length === 0) {
    throw new Error("refund job is missing refundId");
  }
  return { refundId };
}
