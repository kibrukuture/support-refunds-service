-- migrate:no-transaction
-- Replaces the customer index with one that also covers the default ordering.
-- If the new index is missing or invalid, this migration stops before dropping
-- the old one; drop the invalid index and run it again.

CREATE INDEX CONCURRENTLY IF NOT EXISTS refunds_customer_created_idx
  ON refunds (customer_id, created_at);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM pg_index
     WHERE indexrelid = to_regclass('public.refunds_customer_created_idx')
       AND indisvalid
  ) THEN
    RAISE EXCEPTION 'refunds_customer_created_idx is missing or invalid; refunds_customer_idx was kept';
  END IF;
END
$$;

DROP INDEX IF EXISTS refunds_customer_idx;
