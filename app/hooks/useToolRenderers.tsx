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
import { Alert, AlertTitle, AlertDescription } from "../components/ui/alert";
import { AlertTriangle } from "lucide-react";
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

      if (mergedAssets.length === 0) return <></>;

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

      if (items.length === 0) return <></>;

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
      if (typedArgs.skipReason) {
        const reasonMap: Record<string, string> = {
          too_large:
            "This function is too large (>8KB) to safely analyze and split automatically.",
          incomplete_context:
            "Could not safely identify the function boundaries in this bundle.",
          minified_no_context:
            "This script is minified and lacks the necessary structural context for splitting.",
        };
        return (
          <Alert className="bg-amber-50/50 border-amber-200/50 mb-4">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-900 font-semibold">
              Task too complex for AI split
            </AlertTitle>
            <AlertDescription className="text-amber-800 text-xs">
              {reasonMap[typedArgs.skipReason as string] ||
                "This script execution cannot be safely modified."}
              <div className="mt-2">
                The full source for{" "}
                <code className="bg-amber-100/50 px-1 rounded">
                  {(typedArgs.scriptUrl as string)?.split("/").pop()}
                </code>{" "}
                should be reviewed manually.
              </div>
            </AlertDescription>
          </Alert>
        );
      }

      // GUARD: If no source snippet was provided, do not show the splitter.
      if (!typedArgs.code) {
        return <></>;
      }

      const lineOffset = (typedArgs.lineOffset as number) ?? 0;
      const rawMarkers = (typedArgs.markers as number[]) ?? [];
      const rawStrategies =
        (typedArgs.yieldStrategies as YieldStrategy[]) ?? [];

      const combinedPositions = Array.from(
        new Set([...rawMarkers, ...rawStrategies.map((s) => s.position)]),
      );

      // The AI is instructed to provide absolute 1-based line numbers.
      // We convert these to 0-based relative indices for the ExecutionSplitter by subtracting lineOffset (0-based start) and 1.
      const toRelative = (absoluteLine: number) =>
        absoluteLine - lineOffset - 1;

      // Map absolute numbers to snippet-relative indexing
      const normalizedMarkers = combinedPositions.map(toRelative);
      const normalizedStrategies = rawStrategies.map((s) => ({
        ...s,
        position: toRelative(s.position),
      }));

      if (normalizedMarkers.length === 0 && normalizedStrategies.length === 0)
        return <></>;

      return (
        <SectionWrapper type="EXECUTION_SPLITTER">
          <ExecutionSplitter
            scriptUrl={(typedArgs.scriptUrl as string) ?? ""}
            code={(typedArgs.code as string) ?? ""}
            markers={normalizedMarkers}
            strategies={normalizedStrategies}
            onYield={(pos, strategy) =>
              onYield(
                (typedArgs.scriptUrl as string) ?? "",
                pos + lineOffset,
                strategy,
              )
            }
          />
          {normalizedStrategies.map((s) => (
            <p key={s.position} className="text-xs text-slate-500 mt-1">
              Line {s.position + lineOffset}: <code>{s.strategy}</code> —{" "}
              {s.reason}
            </p>
          ))}
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
        description: `Array: { assetName, type: "img", suggestions: Array<{ type: "${FIX_STRATEGIES.SET_DIMENSIONS}" | "${FIX_STRATEGIES.USE_ASPECT_RATIO}", label: string, params?: { width: number, height: number } }>, imageUrl?, width?, height? }`,
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

      if (items.length === 0) return <></>;

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
