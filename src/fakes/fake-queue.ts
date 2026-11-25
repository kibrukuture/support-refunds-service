import type { Queue, QueueMessage } from "../queue/types.js";

export class AccessDeniedError extends Error {
  constructor(action: string) {
    super(`Access to the resource with the action ${action} is denied`);
    this.name = "AccessDeniedError";
  }
}

interface Entry {
  readonly id: string;
  readonly body: string;
  receiptHandle: string;
  visibleAt: number;
  receiveCount: number;
  deleted: boolean;
}

export class FakeQueue implements Queue {
  private readonly entries: Entry[] = [];
  private messageCounter = 0;
  private handleCounter = 0;

  readonly denied = new Set<string>();
  readonly visibilityCalls: { receiptHandle: string; seconds: number }[] = [];
  readonly deletedHandles: string[] = [];
  readonly receivedIds: string[] = [];

  constructor(bodies: readonly string[] = []) {
    for (const body of bodies) {
      this.enqueue(body);
    }
  }

  enqueue(body: string): string {
    const id = `msg_${(this.messageCounter += 1)}`;
    this.entries.push({
      id,
      body,
      receiptHandle: `rh_${(this.handleCounter += 1)}`,
      visibleAt: 0,
      receiveCount: 0,
      deleted: false,
    });
    return id;
  }

  /** Simulates the visibility timeout elapsing for every message. */
  expireVisibility(): void {
    for (const entry of this.entries) {
      entry.visibleAt = 0;
    }
  }

  pending(): number {
    return this.entries.filter((entry) => !entry.deleted).length;
  }

  async receive(): Promise<QueueMessage | null> {
    if (this.denied.has("sqs:ReceiveMessage")) {
      throw new AccessDeniedError("sqs:ReceiveMessage");
    }
    const now = Date.now();
    const entry = this.entries.find((candidate) => !candidate.deleted && candidate.visibleAt <= now);
    if (entry === undefined) {
      return null;
    }
    entry.receiveCount += 1;
    entry.receiptHandle = `rh_${(this.handleCounter += 1)}`;
    entry.visibleAt = now + 30_000;
    this.receivedIds.push(entry.id);
    return {
      id: entry.id,
      receiptHandle: entry.receiptHandle,
      body: entry.body,
      receiveCount: entry.receiveCount,
    };
  }

  async changeVisibility(receiptHandle: string, seconds: number): Promise<void> {
    if (this.denied.has("sqs:ChangeMessageVisibility")) {
      throw new AccessDeniedError("sqs:ChangeMessageVisibility");
    }
    this.visibilityCalls.push({ receiptHandle, seconds });
    const entry = this.entries.find((candidate) => candidate.receiptHandle === receiptHandle);
    if (entry !== undefined) {
      entry.visibleAt = Date.now() + seconds * 1_000;
    }
  }

  async delete(receiptHandle: string): Promise<void> {
    if (this.denied.has("sqs:DeleteMessage")) {
      throw new AccessDeniedError("sqs:DeleteMessage");
    }
    this.deletedHandles.push(receiptHandle);
    const entry = this.entries.find((candidate) => candidate.receiptHandle === receiptHandle);
    if (entry !== undefined) {
      entry.deleted = true;
    }
  }
}
