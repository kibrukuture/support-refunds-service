# Deployment

Terraform owns the cluster, the task definitions, the services, the database and
the queue. Images are built and pushed by hand before a release.

## Release order

1. Build and push the image with the new tag.
2. Apply the infrastructure change with `terraform apply`. This registers new
   task definition revisions. It does not move traffic yet if the service update
   is run separately.
3. Run the migration task to completion:

   ```sh
   aws ecs run-task \
     --cluster support-refunds-staging \
     --task-definition support-refunds-staging-migrate \
     --launch-type FARGATE \
     --network-configuration '...'
   ```

   The migration task runs before any new application task starts. The previous
   API and worker tasks keep serving traffic while it runs.
4. Update the services to the new task definition revision:

   ```sh
   aws ecs update-service --cluster support-refunds-staging \
     --service support-refunds-staging-api --task-definition support-refunds-staging-api:NEW
   aws ecs update-service --cluster support-refunds-staging \
     --service support-refunds-staging-worker --task-definition support-refunds-staging-worker:NEW
   ```

## Rolling replacement

Both services use `deployment_maximum_percent = 200` and
`deployment_minimum_healthy_percent = 100`. ECS starts the replacement tasks
before it stops the tasks they replace, so for a short window both revisions run
at the same time and both connect to the same database.

A deployment that fails its health checks is stopped by ECS. The previous task
set keeps running.

## Migrations

`scripts/migrate.ts` applies every `.sql` file in `migrations` in filename order
and records the applied names in `schema_migrations`. A file that starts with

```sql
-- migrate:no-transaction
```

is sent to Postgres one statement at a time, without a surrounding transaction,
because statements such as `CREATE INDEX CONCURRENTLY` cannot run inside one. The
version is recorded only after every statement succeeds.

Migrations are forward-only. There are no down migrations; a bad release is
rolled back by deploying the previous image, which assumes the schema still
supports it.

## Rollback

1. Update both services to the previous task definition revision.
2. If the release included a migration, check whether the previous image can run
   against the new schema before rolling back.
