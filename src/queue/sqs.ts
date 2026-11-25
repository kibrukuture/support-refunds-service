import {
  ChangeMessageVisibilityCommand,
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient,
} from "@aws-sdk/client-sqs";

import { config } from "../config.js";
import type { Queue, QueueMessage } from "./types.js";

const WAIT_TIME_SECONDS = 20;

export class SqsQueue implements Queue {
  private readonly client: SQSClient;

  constructor(
    private readonly queueUrl: string,
    private readonly visibilityTimeoutSeconds: number = config.queue.visibilityTimeoutSeconds,
  ) {
    this.client = new SQSClient({});
  }

  async send(body: string): Promise<void> {
    await this.client.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: body,
      }),
    );
  }

  async receive(): Promise<QueueMessage | null> {
    const result = await this.client.send(
      new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: 1,
        WaitTimeSeconds: WAIT_TIME_SECONDS,
        VisibilityTimeout: this.visibilityTimeoutSeconds,
        MessageSystemAttributeNames: ["ApproximateReceiveCount"],
      }),
    );
    const message = result.Messages?.[0];
    if (!message?.ReceiptHandle) {
      return null;
    }
    return {
      id: message.MessageId ?? "unknown",
      receiptHandle: message.ReceiptHandle,
      body: message.Body ?? "",
      receiveCount: Number(message.Attributes?.["ApproximateReceiveCount"] ?? "1"),
    };
  }

  async changeVisibility(receiptHandle: string, seconds: number): Promise<void> {
    await this.client.send(
      new ChangeMessageVisibilityCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: receiptHandle,
        VisibilityTimeout: seconds,
      }),
    );
  }

  async delete(receiptHandle: string): Promise<void> {
    await this.client.send(
      new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: receiptHandle,
      }),
    );
  }
}
