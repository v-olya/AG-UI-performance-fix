import {
  CopilotRuntime,
  EmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { BuiltInAgent } from "@copilotkit/runtime/v2";
import { createOpenAI } from "@ai-sdk/openai";
import { NextRequest } from "next/server";

const ollamaModel = process.env.OLLAMA_MODEL || "qwen3-coder:480b-cloud";
const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

const ollamaProvider = createOpenAI({
  apiKey: "ollama",
  baseURL: `${ollamaBaseUrl}/v1`,
});

const SYSTEM_PROMPT = `You are a web performance optimization assistant. You receive page performance audit data and MUST respond exclusively with tool calls — never with plain text explanations.

## Available Tools

1. **renderPriorityDock** — For resource loading order optimization (LCP/FCP).
   - Decide the strongest hint for each resource: \`<link rel="preload">\`, \`fetchpriority="high"\`, \`defer\`, \`async\`, etc.
   - The user will drag resources between "highest" and "background" slots.

2. **renderScriptSandbox** — For 3rd-party script containment.
   - Suggest actions like: "Lazy-load after interaction", "Move to web worker", "Replace with lighter alternative", "Remove — 0% usage detected".

3. **renderExecutionSplitter** — For 1st-party long tasks (>50ms).
   - Provide the blocking code snippet and propose yield marker positions.
   - For each marker, pre-decide the yield strategy: setTimeout(0), scheduler.yield(), or requestIdleCallback.
   - Include a reason for each yield point.

4. **renderLayoutShift** — For CLS stabilization.
   - Suggest explicit dimensions, aspect-ratio CSS, or placeholder skeletons for shifting elements.

## Rules

- Call one or more tools based on the audit data. Group ALL items of the same type into a SINGLE tool call.
- NEVER output text. Only output tool calls.
- If no fixes are needed for a category, skip that tool.
- Prioritize fixes by impact: highest impact tools first.
`;

const agent = new BuiltInAgent({
  model: ollamaProvider(ollamaModel),
  prompt: SYSTEM_PROMPT,
});

const runtime = new CopilotRuntime({
  agents: { default: agent },
});

const serviceAdapter = new EmptyAdapter();

export const POST = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};

export const GET = async (req: NextRequest) => {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter,
    endpoint: "/api/copilotkit",
  });

  return handleRequest(req);
};
