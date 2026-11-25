import { log } from "../logger.js";
import type { Queue, QueueMessage } from "../queue/types.js";

export interface HeartbeatOptions {
  readonly intervalMs: number;
  readonly extensionSeconds: number;
}

/**
 * Keeps a message invisible while a slow job runs. Extensions are best effort:
 * a failed extension is logged and the job continues, because the payment call
 * may already be in flight at the provider.
 */
export async function withVisibilityHeartbeat<T>(
  queue: Queue,
  message: QueueMessage,
  work: () => Promise<T>,
  options: HeartbeatOptions,
): Promise<T> {
  const timer = setInterval(() => {
    void queue.changeVisibility(message.receiptHandle, options.extensionSeconds).catch((error: unknown) => {
      log("warn", "could not extend message visibility", {
        messageId: message.id,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }, options.intervalMs);

  timer.unref();

  try {
    return await work();
  } finally {
    clearInterval(timer);
  }
}
