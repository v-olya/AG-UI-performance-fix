"use client";

import { useCallback, useState } from "react";
import { useCopilotChat } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import { Role, TextMessage } from "@copilotkit/runtime-client-gql";
import { PerformanceAuditCard } from "./PerformanceAuditCard";
import { useToolRenderers } from "../hooks/useToolRenderers";
import type { Vitals } from "@/scripts/types";
import type {
  ScorecardDelta,
  MetricScore,
  AIProposedFix,
} from "@/scripts/InjectFixesAndReAudit";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Skeleton } from "./ui/skeleton";
import { Loader2, Search } from "lucide-react";
import { useCopilotError } from "@/app/lib/copilot-error-context";
import { ErrorCode } from "@/app/lib/constants";
import type { StructuredApiError } from "@/app/types/api-error";
import { StructuredSuggestion, FIX_STRATEGIES } from "@/app/lib/fix-strategies";

type AuditPhase =
  | "idle"
  | "auditing"
  | "prompting"
  | "interactive"
  | "reauditing";

interface AuditResult {
  vitals: Vitals;
  lcpElement: string;
  data: Record<string, unknown>;
}

interface UserChoice {
  type: "priority" | "suggestion" | "yield";
  assetId?: string;
  assetName?: string;
  slot?: "highest" | "background";
  suggestion?: StructuredSuggestion; // Changed to structured
  scriptUrl?: string;
  position?: number;
  strategy?: string;
}

export function AuditCanvas() {
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<AuditPhase>("idle");
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [scorecard, setScorecard] = useState<ScorecardDelta | null>(null);
  const { pushError, clearError } = useCopilotError();

  const [userChoices, setUserChoices] = useState<UserChoice[]>([]);

  const { appendMessage, reset, isLoading } = useCopilotChat();

  const handlePriorityChange = useCallback(
    (assetId: string, slot: "highest" | "background") => {
      setUserChoices((prev) => [...prev, { type: "priority", assetId, slot }]);
    },
    [],
  );

  const handleSuggestionClick = useCallback(
    (assetName: string, suggestion: StructuredSuggestion) => {
      setUserChoices((prev) => [
        ...prev,
        {
          type: "suggestion",
          assetName,
          suggestion,
        },
      ]);
    },
    [],
  );

  const handleYield = useCallback(
    (scriptUrl: string, position: number, strategy?: string) => {
      setUserChoices((prev) => [
        ...prev,
        {
          type: "yield",
          scriptUrl,
          position,
          strategy,
        },
      ]);
    },
    [],
  );

  useToolRenderers({
    auditResult,
    onYield: handleYield,
    onPriorityChange: handlePriorityChange,
    onSuggestionClick: handleSuggestionClick,
  });

  const runAudit = async () => {
    if (!url.trim()) return;

    setPhase("auditing");
    clearError();
    setScorecard(null);
    setUserChoices([]);
    reset(); // Clear previous suggestions

    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error: StructuredApiError;
        } | null;
        const code = body?.error?.code ?? ErrorCode.AUDIT_FAILED;
        pushError(code, body?.error);
        setPhase("idle");
        return;
      }

      const result = (await response.json()) as AuditResult & {
        success: boolean;
      };
      setAuditResult(result);
      setPhase("prompting");

      const healthCheck = await fetch("/api/health").catch(() => null);
      if (!healthCheck?.ok) {
        const body = (await healthCheck?.json().catch(() => null)) as {
          error?: StructuredApiError;
        } | null;
        pushError(
          body?.error?.code ?? ErrorCode.SERVICE_UNAVAILABLE,
          body?.error,
        );
        setPhase("idle");
        return;
      }

      appendMessage(
        new TextMessage({
          content: `Analyze these performance metrics and render the appropriate fix components:\n\n${JSON.stringify(result.data, null, 2)}`,
          role: Role.User,
        }),
      );

      setPhase("interactive");
    } catch (err) {
      pushError(ErrorCode.NETWORK_ERROR, err);
      setPhase("idle");
    }
  };

  const runRecalculate = async () => {
    if (!auditResult || !url.trim()) return;

    setPhase("reauditing");
    clearError();

    const fixes: AIProposedFix[] = userChoices
      .map((choice) => {
        switch (choice.type) {
          case "priority":
            return {
              type: "head_injection" as const,
              content:
                choice.slot === "highest"
                  ? `<link rel="preload" href="${choice.assetId}" as="script" fetchpriority="high">`
                  : `<script defer src="${choice.assetId}"></script>`,
            };
          case "suggestion":
            if (!choice.suggestion) return null;
            const { type, params } = choice.suggestion;

            switch (type) {
              case FIX_STRATEGIES.SET_DIMENSIONS:
                return {
                  type: "css_override" as const,
                  content: `img[src*="${choice.assetName}"] { width: ${params?.width}px !important; height: ${params?.height}px !important; aspect-ratio: ${params?.width}/${params?.height} !important; }`,
                };
              case FIX_STRATEGIES.DEFER_SCRIPT:
                return {
                  type: "head_injection" as const,
                  content: `<script src="${choice.assetName}" defer></script>`,
                };
              case FIX_STRATEGIES.ASYNC_SCRIPT:
                return {
                  type: "head_injection" as const,
                  content: `<script src="${choice.assetName}" async></script>`,
                };
              default:
                return {
                  type: "head_injection" as const,
                  content: `<!-- Fix: ${choice.assetName} — ${choice.suggestion.label} -->`,
                };
            }
          case "yield":
            const code =
              choice.strategy === "scheduler.yield"
                ? "await scheduler.yield();"
                : choice.strategy === "requestIdleCallback"
                  ? "await new Promise(res => requestIdleCallback(res));"
                  : "await new Promise(res => setTimeout(res, 0));";

            return {
              type: "js_replace" as const,
              targetFileUrl: choice.scriptUrl,
              content: `/* Line ${choice.position} */ ${code}`,
            };
        }
      })
      .filter(Boolean) as AIProposedFix[];

    const beforeMetrics: MetricScore = {
      lcp_ms: Math.round(auditResult.vitals.lcp),
      total_bytes_kb: 0,
    };

    try {
      const response = await fetch("/api/audit/reaudit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), fixes, beforeMetrics }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error: StructuredApiError;
        } | null;
        const code = body?.error?.code ?? ErrorCode.REAUDIT_FAILED;
        pushError(code, body?.error);
        setPhase("interactive");
        return;
      }

      const result = (await response.json()) as { scorecard: ScorecardDelta };
      setScorecard(result.scorecard);
      setPhase("interactive");
    } catch (err) {
      pushError(ErrorCode.NETWORK_ERROR, err);
      setPhase("interactive");
    }
  };

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <header className="bg-card/80 border-b border-border px-6 py-4 shrink-0 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex items-center gap-4">
          <h1 className="text-sm font-semibold text-primary shrink-0 tracking-tight">
            Performance Fixer
          </h1>
          <div className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="url-input"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="pl-9"
                disabled={
                  phase === "auditing" || phase === "reauditing" || isLoading
                }
                onKeyDown={(e) => e.key === "Enter" && !isLoading && runAudit()}
                aria-label="URL to audit"
              />
            </div>
            <Button
              id="audit-button"
              onClick={runAudit}
              disabled={
                !url.trim() ||
                phase === "auditing" ||
                phase === "reauditing" ||
                isLoading
              }
              className="min-w-24"
            >
              {phase === "auditing" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Auditing
                </>
              ) : (
                "Audit"
              )}
            </Button>
            {phase === "interactive" && (
              <Button
                id="recalculate-button"
                onClick={runRecalculate}
                variant="outline"
                disabled={userChoices.length === 0 || isLoading}
                className="border-border text-foreground hover:bg-accent"
              >
                Recalculate
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-6xl mx-auto py-8 px-4 space-y-8">
          {/* Errors are displayed by the global CopilotErrorBanner */}

          {phase === "auditing" && (
            <div className="space-y-4 py-16">
              <div className="flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary/50" />
                <div className="space-y-2 text-center">
                  <h3 className="text-base font-medium text-foreground">
                    Analyzing Performance
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Launching Playwright and collecting metrics...
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            </div>
          )}

          {phase === "reauditing" && (
            <div className="space-y-4 py-16">
              <div className="flex flex-col items-center justify-center space-y-4">
                <Loader2 className="h-12 w-12 animate-spin text-primary/40" />
                <div className="space-y-2 text-center">
                  <h3 className="text-base font-medium text-foreground">
                    Re-evaluating
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Injecting fixes and re-measuring...
                  </p>
                </div>
              </div>
              <Skeleton className="h-64 w-full" />
            </div>
          )}

          {auditResult && phase !== "auditing" && (
            <PerformanceAuditCard
              vitals={auditResult.vitals}
              lcpElement={auditResult.lcpElement}
              url={url}
              scorecard={scorecard ?? undefined}
            />
          )}

          {isLoading && phase === "prompting" && (
            <div className="text-center text-sm text-slate-400 py-4">
              AI is analyzing performance data...
            </div>
          )}

          {phase === "idle" && !auditResult && (
            <div className="flex flex-col items-center justify-center py-24 animate-in fade-in slide-in-from-bottom-4 duration-700">
              <div className="rounded-full bg-primary/8 p-6 mb-6">
                <Search className="h-12 w-12 text-primary/40" />
              </div>
              <div className="text-center max-w-sm">
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Ready to Audit
                </h3>
                <p className="text-sm text-muted-foreground">
                  Enter a URL above to analyze its performance metrics and
                  generate AI-powered optimization fixes.
                </p>
              </div>
            </div>
          )}

          {/* Inline AI Fix Renderer */}
          <div className="mt-12 space-y-6">
            <CopilotChat
              UserMessage={() => null}
              Input={() => null}
              className="genui-inline-chat"
              labels={{
                placeholder: "AI Suggestions will appear here",
              }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
