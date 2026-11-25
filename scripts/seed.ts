import pg from "pg";

import { config } from "../src/config.js";

const CUSTOMER_A = "11111111-1111-4111-8111-111111111111";
const CUSTOMER_B = "22222222-2222-4222-8222-222222222222";

const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 1 });

await pool.query(
  `INSERT INTO customers (id, email) VALUES ($1, $2), ($3, $4) ON CONFLICT (id) DO NOTHING`,
  [CUSTOMER_A, "ada@example.test", CUSTOMER_B, "grace@example.test"],
);

await pool.query(
  `INSERT INTO sessions (token, customer_id, expires_at)
   VALUES ('session-ada', $1, now() + interval '30 days'),
          ('session-grace', $2, now() + interval '30 days')
   ON CONFLICT (token) DO NOTHING`,
  [CUSTOMER_A, CUSTOMER_B],
);

await pool.query(
  `INSERT INTO orders (id, customer_id, amount, currency, status)
   VALUES ('aaaaaaaa-1111-4111-8111-111111111111', $1, 4200, 'usd', 'paid'),
          ('bbbbbbbb-2222-4222-8222-222222222222', $2, 9900, 'usd', 'paid')
   ON CONFLICT (id) DO NOTHING`,
  [CUSTOMER_A, CUSTOMER_B],
);

process.stdout.write("seeded demo customers, sessions and orders\n");
await pool.end();
