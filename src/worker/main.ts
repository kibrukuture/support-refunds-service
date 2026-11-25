import { config } from "../config.js";
import { createPool } from "../db.js";
import { log } from "../logger.js";
import { HttpPaymentClient } from "../payments/client.js";
import { SqsQueue } from "../queue/sqs.js";
import { PgStore } from "../store/pg.js";
import { processRefundMessage } from "./refund-job.js";

const pool = createPool(config.dbPool.worker);
const queue = new SqsQueue(config.queue.url);
const payments = new HttpPaymentClient(config.payments.baseUrl);
const deps = { store: new PgStore(pool), payments, queue };

let running = true;
process.on("SIGTERM", () => {
  running = false;
});

while (running) {
  const message = await queue.receive();
  if (message === null) {
    continue;
  }
  try {
    await processRefundMessage(deps, message);
  } catch (error) {
    log("error", "refund job failed", {
      messageId: message.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

await pool.end();
