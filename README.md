# AI-powered web performance optimizer

Instead of just giving text advice, this tool analyzes your page metrics, generates interactive UI components to apply the fixes, and re-audits the page to show the exact performance delta.

> **Note:** This project is a work in progress.

## How It Works

1. **Audit**: Enter a target URL. A headless Playwright instance loads the page and extracts raw performance metrics (LCP, FCP, CLS, long tasks, resource order).

2. **Analysis**: Metrics are preprocessed and sent for analysis using **Ollama** via CopilotKit. The LLM is strictly prompted to respond only with tool calls—no chat, no lengthy text blocks.
3. **Agent-Generated UI**: The LLM analyzes the bottlenecks and triggers specific frontend tools. Each tool renders a dedicated React component inline (e.g., a drag-and-drop dock for resource priority, or a code editor for yield points).
4. **Resolution**: The user interacts with generated components to apply some of the fixes proposed by the AI.
5. **Validation**: Click on "Recalculate" injects the fixes into the page and runs a second audit, verifying the impact.

## The AG-UI Pattern

This project showcases **Agent-Generated UI (AG-UI)**.

- **Backend Agent** (`app/api/copilotkit/[[...slug]]/route.tsx`): A CopilotKit `BuiltInAgent` configured with a strict system prompt and a defined set of tools.
- **Frontend Tools** (`app/hooks/useToolRenderers.tsx`): Uses `useFrontendTool()` to register tools and their corresponding `render()` functions.
- **Headless LLM Integration**: The traditional chat interface is omitted. We use `useCopilotChat()` headlessly, sending context programmatically via `appendMessage()`.
- **Inline Rendering**: When the LLM calls a tool, CopilotKit streams and renders the native React component directly into the interface.

## Available Tools

| Tool                      | Purpose                                              |
| ------------------------- | ---------------------------------------------------- |
| `renderPriorityDock`      | Drag-and-drop resource sequencing (LCP/FCP)          |
| `renderScriptSandbox`     | 3rd-party script containment and isolation           |
| `renderExecutionSplitter` | Identifies and suggests yield points in long tasks   |
| `renderLayoutShift`       | Visual tools to diagnose and stabilize CLS anomalies |

## Component Showcase

Check out the `/showcase` route to see the UI components populated with static sample data. No AI or backend required.

## Prerequisites

- **Ollama Integration**: This project requires [Ollama](https://ollama.com/) to be installed.

The model specified in your `.env` must be running and ready to serve requests by the time Playwright finishes the page audit and metrics are ready for analysis.

## Switching LLM Providers

If you want to use a provider other than Ollama, follow these steps:

1. **Install the provider package**:

   ```bash
   npm install @ai-sdk/openai # or @ai-sdk/google, @ai-sdk/anthropic, etc.
   ```

2. **Update Environment Variables**: Add your API key to `.env`:

   ```env
   PROVIDER_API_KEY=your_key_here
   ```

3. **Modify the Agent Route**: Update `app/api/copilotkit/[[...slug]]/route.tsx`. You will need to replace the Ollama provider initialization with the new one:

   ```typescript
   // 1. Swap the import if using a different provider (e.g., Anthropic)
   import { createOpenAI } from "@ai-sdk/openai";

   // 2. Initialize the new provider with your credentials
   const openai = createOpenAI({
     apiKey: process.env.PROVIDER_API_KEY,
   });

   // 3. Update the agent to use the new model
   const agent = new BuiltInAgent({
     model: openai("gpt-4o"), // Pass the model name here
     prompt: SYSTEM_PROMPT, // You can also tweak SYSTEM_PROMPT in this file
   });
   ```

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```

### Environment Variables

Configure your `.env` file before starting:

- `OLLAMA_BASE_URL` - Your Ollama server endpoint (default: `http://localhost:11434`)
- `OLLAMA_MODEL` - The model used for analysis

## Stack

- Next.js 16 + React 19
- CopilotKit (AG-UI via `useFrontendTool`)
- Playwright (Headless auditing)
- Tailwind CSS + shadcn/ui
