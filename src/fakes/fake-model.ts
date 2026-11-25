import type { Model, ModelRequest, ModelResponse, ToolCall } from "../api/agent/model.js";

export function textReply(text: string): ModelResponse {
  return { text, calls: [] };
}

export function toolCall(name: string, args: Record<string, unknown>, id = `call_${name}`): ToolCall {
  return { id, name, arguments: args };
}

export function toolReply(calls: readonly ToolCall[], text = ""): ModelResponse {
  return { text, calls };
}

export class ScriptedModel implements Model {
  private index = 0;

  readonly requests: ModelRequest[] = [];

  constructor(private readonly script: readonly ModelResponse[]) {}

  async complete(request: ModelRequest): Promise<ModelResponse> {
    this.requests.push(request);
    const response = this.script[this.index];
    this.index += 1;
    return response ?? textReply("Is there anything else I can help with?");
  }
}
