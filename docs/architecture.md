# Architecture

## Components

| Component | Runs on | Responsibility |
| --- | --- | --- |
| API service | ECS Fargate, behind the platform ingress | Session auth, chat endpoint, agent loop, agent tools |
| Refund worker | ECS Fargate | Reads refund jobs, calls the payment provider, updates refund state |
| Postgres | RDS | Customers, sessions, orders, refunds |
| Refund queue | SQS | One message per refund job, plus a dead-letter queue |
| Migration task | ECS Fargate, one-off | Applies SQL migrations before a release |

The API and the worker share the database but not a process. The API writes a
refund row and enqueues a job; the worker is the only component that talks to the
payment provider.

## Chat request

1. `POST /chat` with a bearer session token and a message.
2. The session token is resolved to a customer id in the `sessions` table.
3. The agent loop sends the conversation and the tool definitions to the model.
4. When the model asks for a tool, the service runs it with the customer id from
   the session, not from the model output.
5. The loop stops when the model answers with text, or after six turns.

## Refund flow

1. A tool creates a `refunds` row with status `pending`.
2. The API publishes `{"refundId": "..."}` to the refund queue.
3. The worker receives the message, sets the refund to `processing`, and calls
   `POST /v1/refunds` on the payment provider.
4. On success the worker sets the refund to `succeeded` and deletes the message.

The queue visibility timeout is 30 seconds. A provider call may take up to 60
seconds, so the worker extends the message visibility every 10 seconds while the
call is in flight, using `ChangeMessageVisibility`.

## Capacity

The API keeps a database pool of 12 connections per task and the worker keeps a
pool of 10. The API runs 4 tasks and the worker 2 in the default environment.
Task counts live in `terraform/variables.tf`; pool sizes live in `src/config.ts`.

The database parameter group sets `max_connections` to 200 and reserves 3 for
superusers, leaving 197 for the application.

## Data model

`customers` and `orders` are written by the storefront, which is not part of this
repository. `refunds.customer_id` is copied from the order when the refund row is
created, so the refund list can be read without joining `orders`.

## Failure handling

- A payment provider error sets the refund to `failed` and leaves the message on
  the queue for redelivery.
- Five failed receives move a message to the dead-letter queue.
- A refund that is already `succeeded` is skipped when its message is delivered
  again.
