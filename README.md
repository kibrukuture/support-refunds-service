# support-refunds-service

An example backend for a customer support agent that can answer questions about
orders and refunds. It is small enough to read in one sitting and complete enough
to run locally without any cloud account.

> This repository is a sample service used for testing and demonstration. It is
> not production software. Do not deploy it or point it at real customer data.

## What is in here

- `src/api` — HTTP service that receives chat messages and runs the agent loop.
  The agent can call typed tools: `lookupOrder`, `checkRefundStatus` and
  `listRefunds`.
- `src/worker` — refund worker that reads refund jobs from a queue and calls the
  payment provider.
- `src/store` — data access, with a Postgres implementation and an in-memory one
  used by tests.
- `src/payments` — payment provider client.
- `src/fakes` — local stand-ins for the language model, the queue and the payment
  provider.
- `migrations` — SQL schema, applied in filename order by `scripts/migrate.ts`.
- `terraform` — the AWS stack for the two services, the database and the queue.
  It has never been applied.
- `docs` — architecture, deployment and payment contract notes.

## Requirements

- Node.js 22 or newer
- pnpm 9 or npm 10
- Postgres 14 or newer for the database-backed path

## Install and check

```sh
pnpm install
pnpm typecheck
pnpm test
```

The test suite uses the in-memory store and the fakes, so it needs no database,
network access, API key or payment account.

## Running locally

```sh
export DATABASE_URL=postgres://postgres:postgres@localhost:5432/support
pnpm migrate
pnpm seed
pnpm api
```

`pnpm api` needs `MODEL_BASE_URL`, and the worker needs a queue URL. For a quick
look at the response shape, the tests in `test/api.test.ts` drive the same code
with a scripted model.

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — components and request flow
- [`docs/deployment.md`](docs/deployment.md) — how a release is rolled out
- [`docs/payment-contract.md`](docs/payment-contract.md) — the provider API we call

## Licence

MIT.
