import type { Model, ModelRequest, ModelResponse, ToolCall } from "./model.js";

interface ChatCompletionMessage {
  readonly content?: string | null;
  readonly tool_calls?: readonly {
    readonly id: string;
    readonly function: { readonly name: string; readonly arguments: string };
  }[];
}

interface ChatCompletionResponse {
  readonly choices?: readonly { readonly message?: ChatCompletionMessage }[];
}

export interface HttpModelOptions {
  readonly baseUrl: string;
  readonly apiKey: string | undefined;
  readonly model: string;
}

export class HttpModel implements Model {
  constructor(
    private readonly options: HttpModelOptions,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async complete(request: ModelRequest): Promise<ModelResponse> {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (this.options.apiKey !== undefined) {
      headers.authorization = `Bearer ${this.options.apiKey}`;
    }

    const response = await this.fetchImpl(`${this.options.baseUrl}/v1/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: this.options.model,
        messages: request.messages.map(toChatMessage),
        tools: request.tools.map((tool) => ({
          type: "function",
          function: {
            name: tool.name,
            description: tool.description,
            parameters: {
              type: "object",
              properties: Object.fromEntries(
                Object.entries(tool.parameters).map(([key, value]) => [
                  key,
                  { type: value.type, description: value.description },
                ]),
              ),
              required: Object.entries(tool.parameters)
                .filter(([, value]) => value.required === true)
                .map(([key]) => key),
            },
          },
        })),
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(`model request failed with status ${response.status}`);
    }

    const body = (await response.json()) as ChatCompletionResponse;
    const choice = body.choices?.[0]?.message;
    const calls: ToolCall[] = (choice?.tool_calls ?? []).map((call) => ({
      id: call.id,
      name: call.function.name,
      arguments: parseArguments(call.function.arguments),
    }));

    return { text: choice?.content ?? "", calls };
  }
}

function parseArguments(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function toChatMessage(message: ModelRequest["messages"][number]): Record<string, unknown> {
  if (message.role === "tool") {
    return { role: "tool", tool_call_id: message.toolCallId ?? "", content: message.content };
  }
  return { role: message.role, content: message.content };
}
