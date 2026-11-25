export interface QueueMessage {
  readonly id: string;
  readonly receiptHandle: string;
  readonly body: string;
  readonly receiveCount: number;
}

export interface Queue {
  receive(): Promise<QueueMessage | null>;
  changeVisibility(receiptHandle: string, seconds: number): Promise<void>;
  delete(receiptHandle: string): Promise<void>;
}
