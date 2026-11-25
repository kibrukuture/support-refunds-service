import type { Store } from "../store/types.js";

export interface Session {
  readonly customerId: string;
}

export class UnauthorizedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export async function resolveSession(
  store: Store,
  authorization: string | undefined,
): Promise<Session> {
  const token = bearerToken(authorization);
  if (token === null) {
    throw new UnauthorizedError("missing bearer token");
  }
  const customerId = await store.findCustomerBySession(token);
  if (customerId === null) {
    throw new UnauthorizedError("session is not valid");
  }
  return { customerId };
}

function bearerToken(header: string | undefined): string | null {
  if (header === undefined) {
    return null;
  }
  const [scheme, value] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || value === undefined || value.length === 0) {
    return null;
  }
  return value;
}
