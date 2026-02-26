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
import { Skeleton } from "../components/ui/skeleton";
import { Card } from "../components/ui/card";
import { StructuredSuggestion, FIX_STRATEGIES } from "../lib/fix-strategies";

interface ScriptSandboxItem {
  assetName: string;
  type: "script";
  suggestions: StructuredSuggestion[];
}

interface LayoutShiftItem {
  assetName: string;
  type: "img";
  suggestions: StructuredSuggestion[];
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
  auditResult?: any | null;
  onYield: (scriptUrl: string, position: number, strategy?: string) => void;
  onPriorityChange: (assetId: string, slot: "highest" | "background") => void;
  onSuggestionClick: (
    assetName: string,
    suggestion: StructuredSuggestion,
  ) => void;
}

export function useToolRenderers({
  auditResult,
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
          "Array of assets: { id, name, volume (KB), startTime (ms), type (script|css|font|img), moveTo? (highest|background|null), isSuggested? (boolean) }",
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
          <SectionWrapper type="PRIORITY_DOCK">
            <Card className="p-6 space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <div className="grid grid-cols-2 gap-4">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            </Card>
          </SectionWrapper>
        );
      }
      const aiAssets =
        ((args as Record<string, unknown>).assets as AssetItem[]) ?? [];
      const aiSuggestion = (args as Record<string, unknown>).aiSuggestion as
        | string
        | undefined;

      // Merge base audit data with AI suggestions
      // The auditResult.data.performance.asset_priorities is the list of top N resources
      const baseAssets =
        (auditResult?.data?.performance?.asset_priorities as any[]) || [];

      const mergedAssets: AssetItem[] = baseAssets.map((base: any) => {
        const suggestion = aiAssets.find(
          (s) =>
            s.id === base.id ||
            s.name === base.basename ||
            s.id === base.fullUrl,
        );
        return {
          id: base.id || base.fullUrl || base.basename,
          name: base.basename,
          volume: base.transferSizeKb,
          startTime: base.fetchStart_ms ?? 0,
          duration: base.duration_ms,
          type: base.type,
          priority: base.priority,
          isSuggested: suggestion?.isSuggested ?? false,
          moveTo: suggestion?.moveTo ?? null,
        };
      });

      return (
        <SectionWrapper type="PRIORITY_DOCK">
          <PriorityDock
            key={mergedAssets.map((a) => a.id).join(",") + status}
            assets={mergedAssets}
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
        description: `Array: { assetName: string, type: "script", suggestions: Array<{ type: "${FIX_STRATEGIES.DEFER_SCRIPT}" | "${FIX_STRATEGIES.ASYNC_SCRIPT}" | "${FIX_STRATEGIES.REMOVE_UNUSED}" | "${FIX_STRATEGIES.LAZY_LOAD_ON_INTERACTION}", label: string, params?: object }> }`,
        required: true,
      },
    ],
    handler: () => {
      return "Script Sandbox rendered";
    },
    render: ({ status, args }) => {
      if (status === "inProgress") {
        return (
          <SectionWrapper type="SCRIPT_SANDBOX">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-6 space-y-3">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-20 w-full" />
              </Card>
              <Card className="p-6 space-y-3">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-20 w-full" />
              </Card>
            </div>
          </SectionWrapper>
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
              suggestions={item.suggestions}
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
      {
        name: "lineOffset",
        type: "number",
        description: "Starting line number of the snippet in the original file",
      },
    ],
    handler: () => {
      return "Execution Splitter rendered";
    },
    render: ({ status, args }) => {
      if (status === "inProgress") {
        return (
          <SectionWrapper type="EXECUTION_SPLITTER">
            <Card className="p-6 space-y-4">
              <Skeleton className="h-40 w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-24" />
                <Skeleton className="h-8 w-24" />
              </div>
            </Card>
          </SectionWrapper>
        );
      }
      const typedArgs = args as Record<string, unknown>;
      // GUARD: If no source snippet was provided, do not show the splitter.
      if (!typedArgs.code) {
        return <></>;
      }

      return (
        <SectionWrapper type="EXECUTION_SPLITTER">
          <ExecutionSplitter
            scriptUrl={(typedArgs.scriptUrl as string) ?? ""}
            code={(typedArgs.code as string) ?? ""}
            markers={(typedArgs.markers as number[]) ?? []}
            strategies={typedArgs.yieldStrategies as YieldStrategy[]}
            onYield={(pos, strategy) =>
              onYield(
                (typedArgs.scriptUrl as string) ?? "",
                pos + ((typedArgs.lineOffset as number) ?? 0),
                strategy,
              )
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
        description: `Array: { assetName, type: "img", suggestions: Array<{ type: "${FIX_STRATEGIES.SET_DIMENSIONS}" | "${FIX_STRATEGIES.USE_ASPECT_RATIO}" | "${FIX_STRATEGIES.ADD_SKELETON}", label: string, params?: { width: number, height: number } }>, imageUrl?, width?, height? }`,
        required: true,
      },
    ],
    handler: () => {
      return "Layout Shift section rendered";
    },
    render: ({ status, args }) => {
      if (status === "inProgress") {
        return (
          <SectionWrapper type="LAYOUT_SHIFT">
            <div className="space-y-4">
              <Card className="p-6">
                <Skeleton className="h-32 w-full" />
              </Card>
            </div>
          </SectionWrapper>
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
              suggestions={item.suggestions}
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
