import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import pg from "pg";

import { config } from "../src/config.js";
import { log } from "../src/logger.js";

const MIGRATION_LOCK_ID = 4_212_021;
const NO_TRANSACTION = /^[ \t]*--[ \t]*migrate:no-transaction[ \t]*$/m;

/** Splits a migration into individual statements. */
export function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let index = 0;
  let dollarTag: string | null = null;
  let inSingle = false;
  let inDouble = false;
  let inLineComment = false;

  while (index < sql.length) {
    const char = sql[index] as string;
    const next = sql[index + 1];

    if (inLineComment) {
      current += char;
      if (char === "\n") {
        inLineComment = false;
      }
      index += 1;
      continue;
    }

    if (dollarTag !== null) {
      if (sql.startsWith(dollarTag, index)) {
        current += dollarTag;
        index += dollarTag.length;
        dollarTag = null;
        continue;
      }
      current += char;
      index += 1;
      continue;
    }

    if (inSingle) {
      current += char;
      if (char === "'") {
        if (next === "'") {
          current += "'";
          index += 2;
          continue;
        }
        inSingle = false;
      }
      index += 1;
      continue;
    }

    if (inDouble) {
      current += char;
      if (char === '"') {
        inDouble = false;
      }
      index += 1;
      continue;
    }

    if (char === "-" && next === "-") {
      inLineComment = true;
      current += char;
      index += 1;
      continue;
    }

    if (char === "'") {
      inSingle = true;
      current += char;
      index += 1;
      continue;
    }

    if (char === '"') {
      inDouble = true;
      current += char;
      index += 1;
      continue;
    }

    if (char === "$") {
      const match = /^\$[A-Za-z0-9_]*\$/.exec(sql.slice(index));
      if (match !== null) {
        dollarTag = match[0];
        current += dollarTag;
        index += dollarTag.length;
        continue;
      }
    }

    if (char === ";") {
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        statements.push(trimmed);
      }
      current = "";
      index += 1;
      continue;
    }

    current += char;
    index += 1;
  }

  const tail = current.trim();
  if (tail.length > 0) {
    statements.push(tail);
  }
  return statements;
}

export function wantsOwnTransaction(sql: string): boolean {
  return NO_TRANSACTION.test(sql);
}

export async function applyMigrations(pool: pg.Pool, directory: string): Promise<string[]> {
  const client = await pool.connect();
  const applied: string[] = [];

  try {
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_ID]);
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const existing = await client.query<{ version: string }>("SELECT version FROM schema_migrations");
    const done = new Set(existing.rows.map((row) => row.version));
    const files = (await readdir(directory)).filter((name) => name.endsWith(".sql")).sort();

    for (const file of files) {
      if (done.has(file)) {
        continue;
      }

      const sql = await readFile(join(directory, file), "utf8");
      const statements = splitStatements(sql);

      if (wantsOwnTransaction(sql)) {
        // Statements that cannot run inside a transaction block are sent one at a
        // time, and the version is recorded only after all of them succeed.
        for (const statement of statements) {
          await client.query(statement);
        }
        await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [file]);
        applied.push(file);
        continue;
      }

      await client.query("BEGIN");
      try {
        for (const statement of statements) {
          await client.query(statement);
        }
        await client.query("INSERT INTO schema_migrations (version) VALUES ($1)", [file]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      }
      applied.push(file);
    }
  } finally {
    await client.query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_ID]).catch(() => undefined);
    client.release();
  }

  return applied;
}

const entry = process.argv[1];
if (entry !== undefined && import.meta.url === pathToFileURL(entry).href) {
  const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 1 });
  const directory = fileURLToPath(new URL("../migrations/", import.meta.url));
  const applied = await applyMigrations(pool, directory);
  log("info", "migrations applied", { applied, count: applied.length });
  await pool.end();
}
