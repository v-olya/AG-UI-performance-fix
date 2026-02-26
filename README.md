# An interactive web page performance optimizer

Instead of just giving text advice, this AI tool analyzes your page's metrics, generates interactive UI components to apply the fixes, and re-audits the page to show the exact performance delta.

> **Note:** This is a work in progress.

## Table of Contents

- [The AG-UI Pattern](#the-ag-ui-pattern)
- [Component Showcase](#component-showcase)
- [Prerequisites](#prerequisites)
- [Error Handling](#error-handling)
  <details>
  <summary>Subsections</summary>
  - [Architecture](#architecture)
  - [Key files](#key-files)
  - [Handled error types](#handled-error-types)
  - [Known limitations](#known-limitations)
  - [Adding a new error type](#adding-a-new-error-type)
  </details>
- [Stack](#stack)
- [Screenshots](#screenshots)

## How It Works

1. **Audit**: Enter a target URL. A headless Playwright instance loads the page and extracts raw performance metrics (LCP, FCP, CLS, long tasks, resource order).

2. **Analysis**: Metrics are preprocessed and sent for analysis using **Ollama** via CopilotKit. The LLM is strictly prompted to respond only with tool calls—no chat, no lengthy text blocks.
3. **Agent-Generated UI**: The LLM analyzes the bottlenecks and triggers specific frontend tools. Each tool renders a dedicated React component inline (e.g., a drag-and-drop dock for resource priority, or a code editor for yield points).
4. **Resolution**: The user interacts with the generated components to selectively apply the fixes proposed by the AI.
5. **Validation**: Clicking "Recalculate" triggers a second audit to verify the impact. Playwright seamlessly injects these fixes on the fly using:
   - **Network Interception** (`page.route`): Rewrites HTML responses (e.g., injecting `<head>` tags) and replaces external JS/CSS files with optimized versions.
   - **DOM Injection** (`page.addInitScript`): Programmatically applies inline CSS overrides before the page renders.

## The AG-UI Pattern

This project showcases **Agent-Generated UI (AG-UI)**.

- **Backend Agent** (`app/api/copilotkit/[[...slug]]/route.tsx`): A CopilotKit `BuiltInAgent` configured with a strict system prompt and a defined set of tools.
- **Frontend Tools** (`app/hooks/useToolRenderers.tsx`): Uses `useFrontendTool()` to register tools and their corresponding `render()` functions.
- **Inline Rendering**: When the LLM calls a tool, CopilotKit streams and renders the native React component directly into the interface.

### Available Tools

| Tool                      | Purpose                                              |
| ------------------------- | ---------------------------------------------------- |
| `renderPriorityDock`      | Drag-and-drop resource sequencing (LCP/FCP)          |
| `renderScriptSandbox`     | 3rd-party script containment and isolation           |
| `renderExecutionSplitter` | Identifies and suggests yield points in long tasks   |
| `renderLayoutShift`       | Visual tools to diagnose and stabilize CLS anomalies |

## Component Showcase

Check out the `/showcase` route to see the UI components populated with static sample data. No AI or backend required.

## Prerequisites

This project requires [Ollama](https://ollama.com/) to be installed. The model specified in your `.env` must be running and ready to serve requests by the time Playwright finishes the page audit and metrics are ready for analysis.

### Switching LLM Providers

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
- `NEXT_PUBLIC_COPILOTKIT_API_KEY` - Your Copilot Cloud API Key.

**NB!** If you are happy with default CopilotKit error handling, you may initialize the chat with the runtime endpoint instead of an API KEY.

## Error Handling

CopilotKit's built-in dev console is disabled (`showDevConsole={false}`). All errors are routed through a shared React context and rendered as a floating banner with user-friendly messages.

**No heuristic string matching.** All errors carry explicit codes:

- **API routes** return `{ error: { code: ErrorCode, detail: string } }` — the client reads the code directly.
- **Pre-flight health check** (`GET /api/health`) verifies Ollama connectivity + model availability before every LLM call.
- **CopilotKit `onError`** is wired as a secondary signal (maps `CopilotKitErrorCode` → our codes via `COPILOT_CODE_MAP`).

### Architecture

```
CopilotErrorProvider              ← React context (global error state)
  └─ CopilotShell                 ← Wires CopilotKit's onError callback
       ├─ CopilotErrorBanner      ← Floating shadcn Alert with auto-dismiss
       └─ AuditCanvas             ← Health check + structured API errors
            └─ GET /api/health    ← Pre-flight: Ollama up? Model pulled?
```

### Key files

| File                                    | Role                                                                       |
| --------------------------------------- | -------------------------------------------------------------------------- |
| `app/lib/constants.ts`                  | `ErrorCode` enum, `ERROR_TITLE` / `ERROR_MESSAGE` maps                     |
| `app/lib/api-error.ts`                  | `StructuredApiError` type + `buildErrorResponse()` helper                  |
| `app/lib/ollama-health.ts`              | `checkOllamaHealth()` — verifies connectivity + model availability         |
| `app/lib/copilot-error-context.tsx`     | `CopilotErrorProvider`, `useCopilotError`, `classifyCopilotError`          |
| `app/components/CopilotErrorBanner.tsx` | Floating banner (shadcn `Alert` + lucide icons), auto-dismisses after 15 s |
| `app/api/health/route.ts`               | `GET /api/health` — thin wrapper around `checkOllamaHealth()`              |

### Handled error types

| Code                    | Source                        | Trigger                     |
| ----------------------- | ----------------------------- | --------------------------- |
| `SERVICE_UNAVAILABLE`   | `/api/health`                 | Ollama not running          |
| `MODEL_NOT_FOUND`       | `/api/health`                 | Model not pulled in Ollama  |
| `NETWORK_ERROR`         | Client `fetch` catch          | Browser can't reach the API |
| `AUTH_FAILED`           | CopilotKit `onError`          | Invalid API key             |
| `RUNTIME_ERROR`         | CopilotKit `onError`          | LLM configuration error     |
| `AUDIT_FAILED`          | `/api/audit` response         | Playwright audit crash      |
| `REAUDIT_FAILED`        | `/api/audit/reaudit` response | Re-audit crash              |
| `INVALID_URL`           | `/api/audit` response (400)   | Missing or malformed URL    |
| `BROWSER_LAUNCH_FAILED` | `/api/audit` response         | Playwright can't launch     |
| `UNKNOWN`               | Any                           | Unrecognized error          |

### Known limitations

CopilotKit v1.51 swallows LLM errors internally — `appendMessage` never rejects, and `onError` only fires when `publicApiKey` is set. The project now has two defense layers:

1. **Pre-flight health check** (`GET /api/health`) — verified working, catches Ollama down and model not pulled.
2. **`onError` callback** with `publicApiKey` — wired and mapped, should catch mid-inference errors (OOM, context length, Ollama crash during generation). **Not yet empirically tested** — if you hit a mid-inference failure and the banner doesn't appear, this layer needs debugging.

### Adding a new error type

1. Add the key to `ErrorCode` in `app/lib/constants.ts`.
2. Add the title and message to `ERROR_TITLE` and `ERROR_MESSAGE`.
3. Add a lucide icon in `ERROR_ICON` inside `app/components/CopilotErrorBanner.tsx`.
4. For API errors: use `buildErrorResponse(ErrorCode.YOUR_CODE, detail)` in the route.
5. For CopilotKit errors: add a mapping to `COPILOT_CODE_MAP` in `app/lib/copilot-error-context.tsx`.

## Stack

- Next.js 16 + React 19
- CopilotKit (AG-UI via `useFrontendTool`)
- Playwright (Headless auditing)
- Tailwind CSS + shadcn/ui

## Screenshots

<img width="2084" height="950" alt="localhost_3000_" src="https://github.com/user-attachments/assets/fb9d5c16-ec25-4e1d-81dd-759ca776bd75" />

<img width="2084" height="4116" alt="localhost_3000_showcase" src="https://github.com/user-attachments/assets/3a94b7f5-d3f1-460e-a552-c9672edb4235" />
