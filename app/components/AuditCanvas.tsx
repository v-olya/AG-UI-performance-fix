"use client";

import { useCallback, useRef, useState } from "react";
import { useCopilotChat } from "@copilotkit/react-core";
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
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";
import { Skeleton } from "./ui/skeleton";
import { AlertCircle, Loader2, Search } from "lucide-react";

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
  suggestion?: string;
  scriptUrl?: string;
  position?: number;
}

export function AuditCanvas() {
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<AuditPhase>("idle");
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [scorecard, setScorecard] = useState<ScorecardDelta | null>(null);
  const [error, setError] = useState<string | null>(null);

  const userChoicesRef = useRef<UserChoice[]>([]);

  const { appendMessage, isLoading } = useCopilotChat();

  const handlePriorityChange = useCallback(
    (assetId: string, slot: "highest" | "background") => {
      userChoicesRef.current.push({ type: "priority", assetId, slot });
    },
    [],
  );

  const handleSuggestionClick = useCallback(
    (assetName: string, suggestion: string) => {
      userChoicesRef.current.push({
        type: "suggestion",
        assetName,
        suggestion,
      });
    },
    [],
  );

  const handleYield = useCallback((scriptUrl: string, position: number) => {
    userChoicesRef.current.push({ type: "yield", scriptUrl, position });
  }, []);

  useToolRenderers({
    onYield: handleYield,
    onPriorityChange: handlePriorityChange,
    onSuggestionClick: handleSuggestionClick,
  });

  const runAudit = async () => {
    if (!url.trim()) return;

    setPhase("auditing");
    setError(null);
    setScorecard(null);
    userChoicesRef.current = [];

    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!response.ok) {
        throw new Error(`Audit failed: ${response.statusText}`);
      }

      const result = (await response.json()) as AuditResult & {
        success: boolean;
      };
      setAuditResult(result);
      setPhase("prompting");

      appendMessage(
        new TextMessage({
          content: `Analyze these performance metrics and render the appropriate fix components:\n\n${JSON.stringify(result.data, null, 2)}`,
          role: Role.User,
        }),
      );

      setPhase("interactive");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Audit failed");
      setPhase("idle");
    }
  };

  const runRecalculate = async () => {
    if (!auditResult || !url.trim()) return;

    setPhase("reauditing");
    setError(null);

    const fixes: AIProposedFix[] = userChoicesRef.current.map((choice) => {
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
          return {
            type: "head_injection" as const,
            content: `<!-- Fix: ${choice.assetName} — ${choice.suggestion} -->`,
          };
        case "yield":
          return {
            type: "js_replace" as const,
            targetFileUrl: choice.scriptUrl,
            content: `// Yield point inserted at line ${choice.position}`,
          };
      }
    });

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
        throw new Error(`Re-audit failed: ${response.statusText}`);
      }

      const result = (await response.json()) as { scorecard: ScorecardDelta };
      setScorecard(result.scorecard);
      setPhase("interactive");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Re-audit failed");
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
                disabled={phase === "auditing" || phase === "reauditing"}
                onKeyDown={(e) => e.key === "Enter" && runAudit()}
                aria-label="URL to audit"
              />
            </div>
            <Button
              id="audit-button"
              onClick={runAudit}
              disabled={
                !url.trim() || phase === "auditing" || phase === "reauditing"
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
                disabled={userChoicesRef.current.length === 0}
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
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

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

          {/* Tool-rendered components appear here via CopilotKit's message rendering */}
        </div>
      </div>
    </main>
  );
}
