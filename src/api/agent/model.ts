export interface ToolCall {
  readonly id: string;
  readonly name: string;
  readonly arguments: Record<string, unknown>;
}

export interface ModelResponse {
  readonly text: string;
  readonly calls: readonly ToolCall[];
}

export type ModelRole = "system" | "user" | "assistant" | "tool";

export interface ModelMessage {
  readonly role: ModelRole;
  readonly content: string;
  readonly toolCallId?: string;
}

export interface ToolParameter {
  readonly type: "string" | "number";
  readonly description: string;
  readonly required?: boolean;
}

export interface ToolSchema {
  readonly name: string;
  readonly description: string;
  readonly parameters: Record<string, ToolParameter>;
}

export interface ModelRequest {
  readonly messages: readonly ModelMessage[];
  readonly tools: readonly ToolSchema[];
}

export interface Model {
  complete(request: ModelRequest): Promise<ModelResponse>;
}
