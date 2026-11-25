# Payment provider contract

The worker calls one endpoint.

## `POST /v1/refunds`

Headers:

| Header | Required | Meaning |
| --- | --- | --- |
| `content-type` | yes | `application/json` |
| `idempotency-key` | for duplicate protection | A stable key for the refund |

Body:

```json
{
  "refund_id": "8c1f...",
  "order_id": "41ab...",
  "amount": 4200,
  "currency": "usd"
}
```

`amount` is in the currency's minor unit, so 4200 is 42.00 USD.

Response `201`:

```json
{ "id": "pay_123", "status": "succeeded" }
```

## Duplicate protection

The provider stores the result of each request against its `idempotency-key`.
A second request with the same key returns the first result and does not move
money again.

Duplicate protection works only when the key is sent. A request without the
header is treated as a new refund and creates a new payment, even when every
other field is identical.

The key is derived from the refund id, so retries and redeliveries of the same
refund reuse it.

## Timeouts and retries

The provider may take up to 60 seconds to answer. The client uses a 60 second
timeout. A network error or a 5xx response leaves the outcome unknown; the job
stays on the queue and is delivered again later.

## Errors

| Status | Meaning | Worker behaviour |
| --- | --- | --- |
| `400` | Invalid request | Marks the refund `failed`, leaves the message |
| `409` | Conflicting refund for the order | Marks the refund `failed` |
| `5xx` | Provider error | Throws, message is redelivered |
