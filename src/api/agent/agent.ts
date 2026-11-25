import type { Store } from "../../store/types.js";
import { log } from "../../logger.js";
import type { Model, ModelMessage, ToolCall } from "./model.js";
import { findTool, toolSchemas } from "./tools/index.js";
import { systemPrompt } from "./prompt.js";

const MAX_TURNS = 6;

export interface AgentSession {
  readonly customerId: string;
}

export interface AgentDeps {
  readonly model: Model;
  readonly store: Store;
}

export interface AgentResult {
  readonly reply: string;
  readonly toolCalls: readonly ToolCall[];
}

export async function runAgent(
  deps: AgentDeps,
  session: AgentSession,
  message: string,
): Promise<AgentResult> {
  const messages: ModelMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: message },
  ];
  const executed: ToolCall[] = [];

  for (let turn = 0; turn < MAX_TURNS; turn += 1) {
    const response = await deps.model.complete({ messages, tools: toolSchemas() });

    if (response.calls.length === 0) {
      return { reply: response.text, toolCalls: executed };
    }

    messages.push({ role: "assistant", content: response.text });

    for (const call of response.calls) {
      executed.push(call);
      const tool = findTool(call.name);
      let result: unknown;
      if (!tool) {
        result = { error: `unknown tool: ${call.name}` };
      } else {
        try {
          result = await tool.run({ customerId: session.customerId, store: deps.store }, call.arguments);
        } catch (error) {
          result = { error: error instanceof Error ? error.message : "tool failed" };
        }
      }
      messages.push({ role: "tool", toolCallId: call.id, content: JSON.stringify(result) });
    }

    log("info", "agent tools executed", { tools: response.calls.map((call) => call.name) });
  }

  return { reply: "I could not finish that request. A teammate will follow up.", toolCalls: executed };
}
