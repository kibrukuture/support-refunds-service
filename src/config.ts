export const config = {
  httpPort: Number(process.env.PORT ?? 8080),
  databaseUrl: process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:5432/support",
  dbPool: {
    api: 12,
    worker: 10,
  },
  queue: {
    url: process.env.REFUND_QUEUE_URL ?? "",
    visibilityTimeoutSeconds: 30,
    heartbeatIntervalMs: 10_000,
  },
  payments: {
    baseUrl: process.env.PAYMENTS_BASE_URL ?? "http://localhost:9090",
    timeoutMs: 60_000,
  },
  worker: {
    idlePollMs: 1_000,
  },
} as const;
