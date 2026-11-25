import pg from "pg";

import { config } from "./config.js";

export function createPool(max: number): pg.Pool {
  return new pg.Pool({
    connectionString: config.databaseUrl,
    max,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
    application_name: "support-refunds",
  });
}
