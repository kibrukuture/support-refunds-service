import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";

import { log } from "../logger.js";
import type { Queue } from "../queue/types.js";
import type { Store } from "../store/types.js";
import { resolveSession, UnauthorizedError } from "./auth.js";
import { runAgent } from "./agent/agent.js";
import type { Model } from "./agent/model.js";

const BODY_LIMIT_BYTES = 64 * 1024;
const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

export interface AppDeps {
  readonly store: Store;
  readonly model: Model;
  readonly queue: Queue;
}

class BadRequestError extends Error {}

export function createApp(deps: AppDeps): Server {
  return createServer((request, response) => {
    handle(deps, request, response).catch((error: unknown) => {
      log("error", "request failed", { error: error instanceof Error ? error.message : String(error) });
      if (!response.headersSent) {
        sendJson(response, 500, { error: "internal error" });
      }
    });
  });
}

async function handle(deps: AppDeps, request: IncomingMessage, response: ServerResponse): Promise<void> {
  const url = new URL(request.url ?? "/", "http://localhost");

  try {
    if (request.method === "GET" && url.pathname === "/health") {
      sendJson(response, 200, { ok: true });
      return;
    }

    if (request.method === "POST" && url.pathname === "/chat") {
      const session = await resolveSession(deps.store, request.headers.authorization);
      const body = await readJson(request);
      const message = body["message"];
      if (typeof message !== "string" || message.trim().length === 0) {
        throw new BadRequestError("message must be a non-empty string");
      }
      const result = await runAgent(deps, session, message);
      sendJson(response, 200, { reply: result.reply, toolCalls: result.toolCalls.map((call) => call.name) });
      return;
    }

    if (request.method === "GET" && url.pathname === "/refunds") {
      const session = await resolveSession(deps.store, request.headers.authorization);
      const limit = clampLimit(url.searchParams.get("limit"));
      const refunds = await deps.store.listRefunds(session.customerId, limit);
      sendJson(response, 200, {
        refunds: refunds.map((refund) => ({
          id: refund.id,
          orderId: refund.orderId,
          status: refund.status,
          amount: refund.amountCents,
          currency: refund.currency,
          createdAt: refund.createdAt,
        })),
      });
      return;
    }

    sendJson(response, 404, { error: "not found" });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      sendJson(response, 401, { error: "unauthorized" });
      return;
    }
    if (error instanceof BadRequestError) {
      sendJson(response, 400, { error: error.message });
      return;
    }
    throw error;
  }
}

function clampLimit(raw: string | null): number {
  const parsed = raw === null ? DEFAULT_LIMIT : Number(raw);
  if (!Number.isFinite(parsed)) {
    return DEFAULT_LIMIT;
  }
  return Math.min(Math.max(Math.trunc(parsed), 1), MAX_LIMIT);
}

async function readJson(request: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;
    if (total > BODY_LIMIT_BYTES) {
      throw new BadRequestError("request body is too large");
    }
    chunks.push(buffer);
  }
  if (chunks.length === 0) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    throw new BadRequestError("request body must be JSON");
  }
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(payload),
  });
  response.end(payload);
}
