"use client";

import { useFrontendTool } from "@copilotkit/react-core";
import dynamic from "next/dynamic";
import { AssetSuggestionsCard } from "../components/AssetSuggestions";
import { ExecutionSplitter } from "../components/ExecutionSplitter";
import { SectionWrapper } from "../components/SectionWrapper";
import type { AssetItem } from "../components/TimelineBox";

const PriorityDock = dynamic(
  () => import("../components/PriorityDock").then((mod) => mod.PriorityDock),
  { ssr: false },
);

interface ScriptSandboxItem {
  assetName: string;
  type: "script";
  suggestions: string[];
}

interface LayoutShiftItem {
  assetName: string;
  type: "img";
  suggestions: string[];
  imageUrl?: string;
  width?: number;
  height?: number;
}

interface YieldStrategy {
  position: number;
  strategy: "setTimeout" | "scheduler.yield" | "requestIdleCallback";
  reason: string;
}

interface ToolRendererCallbacks {
  onYield: (scriptUrl: string, position: number) => void;
  onPriorityChange: (assetId: string, slot: "highest" | "background") => void;
  onSuggestionClick: (assetName: string, suggestion: string) => void;
}

/**
 * Registers 4 frontend tools (one per SectionType) that the LLM can call.
 * Each tool maps the LLM arguments to existing showcase components.
 */
export function useToolRenderers({
  onYield,
  onPriorityChange,
  onSuggestionClick,
}: ToolRendererCallbacks) {
  useFrontendTool({
    name: "renderPriorityDock",
    description:
      "Render the Priority Dock component for resource loading order optimization. " +
      "Use this for LCP/FCP improvements by reordering resource priorities.",
    parameters: [
      {
        name: "assets",
        type: "object[]",
        description:
          "Array of assets: { id, name, volume (KB), startTime (ms), type (script|css|font|img), moveTo? (highest|background|null) }",
        required: true,
      },
      {
        name: "aiSuggestion",
        type: "string",
        description: "Text suggestion explaining which assets to move and why",
        required: true,
      },
    ],
    handler: () => {
      return "Priority Dock rendered";
    },
    render: ({ status, args }) => {
      if (status === "inProgress") {
        return (
          <div className="animate-pulse p-4 text-slate-400">
            Loading Priority Dock...
          </div>
        );
      }
      const assets = (args as Record<string, unknown>).assets as
        | AssetItem[]
        | undefined;
      const aiSuggestion = (args as Record<string, unknown>).aiSuggestion as
        | string
        | undefined;
      return (
        <SectionWrapper type="PRIORITY_DOCK">
          <PriorityDock
            assets={assets ?? []}
            aiSuggestion={aiSuggestion}
            onPriorityChange={onPriorityChange}
          />
        </SectionWrapper>
      );
    },
  });

  useFrontendTool({
    name: "renderScriptSandbox",
    description:
      "Render suggestions for 3rd-party scripts. " +
      "Use this when third-party scripts contribute to main-thread blocking or page weight.",
    parameters: [
      {
        name: "items",
        type: "object[]",
        description:
          'Array: { assetName: string, type: "script", suggestions: string[] }',
        required: true,
      },
    ],
    handler: () => {
      return "Script Sandbox rendered";
    },
    render: ({ status, args }) => {
      if (status === "inProgress") {
        return (
          <div className="animate-pulse p-4 text-slate-400">
            Loading Script Sandbox...
          </div>
        );
      }
      const items = ((args as Record<string, unknown>).items ??
        []) as ScriptSandboxItem[];
      return (
        <SectionWrapper type="SCRIPT_SANDBOX">
          {items.map((item) => (
            <AssetSuggestionsCard
              key={item.assetName}
              assetName={item.assetName}
              type={item.type}
              text={item.suggestions}
              onSuggestionClick={(suggestion) =>
                onSuggestionClick(item.assetName, suggestion)
              }
            />
          ))}
        </SectionWrapper>
      );
    },
  });

  useFrontendTool({
    name: "renderExecutionSplitter",
    description:
      "Render the Execution Splitter for 1st-party long-running tasks (>50ms). " +
      "The LLM proposes yield marker positions and pre-decides the implementation strategy for each.",
    parameters: [
      {
        name: "scriptUrl",
        type: "string",
        description: "Basename of the script containing the long task",
        required: true,
      },
      {
        name: "code",
        type: "string",
        description: "Code snippet of the blocking function",
        required: true,
      },
      {
        name: "markers",
        type: "number[]",
        description: "Line positions where the LLM suggests yielding",
        required: true,
      },
      {
        name: "yieldStrategies",
        type: "object[]",
        description:
          'Array: { position: number, strategy: "setTimeout"|"scheduler.yield"|"requestIdleCallback", reason: string }',
      },
    ],
    handler: () => {
      return "Execution Splitter rendered";
    },
    render: ({ status, args }) => {
      if (status === "inProgress") {
        return (
          <div className="animate-pulse p-4 text-slate-400">
            Loading Execution Splitter...
          </div>
        );
      }
      const typedArgs = args as Record<string, unknown>;
      return (
        <SectionWrapper type="EXECUTION_SPLITTER">
          <ExecutionSplitter
            code={(typedArgs.code as string) ?? ""}
            markers={(typedArgs.markers as number[]) ?? []}
            onYield={(pos) =>
              onYield((typedArgs.scriptUrl as string) ?? "", pos)
            }
          />
          {(typedArgs.yieldStrategies as YieldStrategy[] | undefined)?.map(
            (s) => (
              <p key={s.position} className="text-xs text-slate-500 mt-1">
                Line {s.position}: <code>{s.strategy}</code> — {s.reason}
              </p>
            ),
          )}
        </SectionWrapper>
      );
    },
  });

  useFrontendTool({
    name: "renderLayoutShift",
    description:
      "Render layout stabilization suggestions for elements causing CLS. " +
      "Use when layout shift attribution found elements without explicit dimensions.",
    parameters: [
      {
        name: "items",
        type: "object[]",
        description:
          'Array: { assetName, type: "img", suggestions: string[], imageUrl?, width?, height? }',
        required: true,
      },
    ],
    handler: () => {
      return "Layout Shift section rendered";
    },
    render: ({ status, args }) => {
      if (status === "inProgress") {
        return (
          <div className="animate-pulse p-4 text-slate-400">
            Loading Layout Stabilization...
          </div>
        );
      }
      const items = ((args as Record<string, unknown>).items ??
        []) as LayoutShiftItem[];
      return (
        <SectionWrapper type="LAYOUT_SHIFT">
          {items.map((item) => (
            <AssetSuggestionsCard
              key={item.assetName}
              assetName={item.assetName}
              type={item.type}
              text={item.suggestions}
              imageUrl={item.imageUrl}
              width={item.width}
              height={item.height}
              onSuggestionClick={(suggestion) =>
                onSuggestionClick(item.assetName, suggestion)
              }
            />
          ))}
        </SectionWrapper>
      );
    },
  });
}
