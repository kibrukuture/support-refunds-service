import { createApp } from "./api/server.js";
import { HttpModel } from "./api/agent/http-model.js";
import { config } from "./config.js";
import { createPool } from "./db.js";
import { SqsQueue } from "./queue/sqs.js";
import { log } from "./logger.js";
import { PgStore } from "./store/pg.js";

const modelBaseUrl = process.env.MODEL_BASE_URL;
if (modelBaseUrl === undefined) {
  throw new Error("MODEL_BASE_URL is required");
}

const pool = createPool(config.dbPool.api);
const store = new PgStore(pool);
const model = new HttpModel({
  baseUrl: modelBaseUrl,
  apiKey: process.env.MODEL_API_KEY,
  model: process.env.MODEL_NAME ?? "support-agent",
});

const queue = new SqsQueue(config.queue.url);
const server = createApp({ store, model, queue });

server.listen(config.httpPort, () => {
  log("info", "api listening", { port: config.httpPort });
});

process.on("SIGTERM", () => {
  server.close(() => {
    void pool.end();
  });
});
