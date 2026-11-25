import assert from "node:assert/strict";
import { test } from "node:test";

import { splitStatements, wantsOwnTransaction } from "../scripts/migrate.js";

test("splits plain statements", () => {
  const statements = splitStatements("CREATE TABLE a (id int); CREATE TABLE b (id int);");
  assert.equal(statements.length, 2);
  assert.match(statements[0] ?? "", /CREATE TABLE a/);
});

test("keeps a dollar-quoted block in one statement", () => {
  const sql = `DO $$
BEGIN
  RAISE NOTICE 'hello; world';
END
$$;
SELECT 1;`;
  const statements = splitStatements(sql);
  assert.equal(statements.length, 2);
  assert.match(statements[0] ?? "", /RAISE NOTICE/);
  assert.equal(statements[1], "SELECT 1");
});

test("does not split on a semicolon inside a string literal", () => {
  const statements = splitStatements("INSERT INTO notes (body) VALUES ('a;b');");
  assert.equal(statements.length, 1);
});

test("does not split on a semicolon inside a line comment", () => {
  const statements = splitStatements("-- one; two\nSELECT 2;");
  assert.equal(statements.length, 1);
  assert.match(statements[0] ?? "", /SELECT 2/);
});

test("detects the no-transaction directive", () => {
  assert.equal(wantsOwnTransaction("-- migrate:no-transaction\nCREATE INDEX CONCURRENTLY i ON t (c);"), true);
  assert.equal(wantsOwnTransaction("CREATE INDEX i ON t (c);"), false);
});
