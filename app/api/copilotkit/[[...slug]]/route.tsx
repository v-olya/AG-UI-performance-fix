import {
  CopilotRuntime,
  EmptyAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from "@copilotkit/runtime";
import { BuiltInAgent } from "@copilotkit/runtime/v2";
import { createOpenAI } from "@ai-sdk/openai";
import { NextRequest } from "next/server";

const ollamaModel = process.env.OLLAMA_MODEL || "gpt-oss:20b-cloud";
const ollamaBaseUrl = process.env.OLLAMA_BASE_URL || "http://localhost:11434";

const ollamaProvider = createOpenAI({
  apiKey: "ollama",
  baseURL: `${ollamaBaseUrl}/v1`,
});

const agent = new BuiltInAgent({
  model: ollamaProvider(ollamaModel),
  prompt: `
You are a page performance assistant. Help users analyze and fix page performance issues.

Rules:
- Use the analyzePerformance tool to analyze page performance.
- When the tool returns a result, ALWAYS render the UI component. Don't describe the results.
  `,
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
