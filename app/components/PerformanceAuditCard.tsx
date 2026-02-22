import type { Vitals } from "@/scripts/types";
import type { ScorecardDelta } from "@/scripts/InjectFixesAndReAudit";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Zap, Activity, Type, MousePointer2, Info } from "lucide-react";

interface PerformanceAuditCardProps {
  vitals: Vitals;
  lcpElement: string;
  url: string;
  scorecard?: ScorecardDelta;
}

type VitalRating = "good" | "needs-improvement" | "poor";

const THRESHOLDS: Record<string, { good: number; poor: number }> = {
  lcp: { good: 2500, poor: 4000 },
  fcp: { good: 1800, poor: 3000 },
  cls: { good: 0.1, poor: 0.25 },
  tbt: { good: 200, poor: 600 },
};

const rateVital = (key: string, value: number): VitalRating => {
  const t = THRESHOLDS[key];
  if (!t) return "good";
  if (value <= t.good) return "good";
  if (value <= t.poor) return "needs-improvement";
  return "poor";
};

const RATING_VARIANTS: Record<
  VitalRating,
  "default" | "secondary" | "destructive"
> = {
  good: "default",
  "needs-improvement": "secondary",
  poor: "destructive",
};

const VITAL_ICONS: Record<string, any> = {
  lcp: Zap,
  fcp: Activity,
  cls: Type,
  tbt: MousePointer2,
};

const formatUnit = (key: string, value: number): string => {
  if (key === "cls") return value.toFixed(3);
  return `${Math.round(value)} ms`;
};

export function PerformanceAuditCard({
  vitals,
  lcpElement,
  url,
  scorecard,
}: PerformanceAuditCardProps) {
  const vitalEntries: Array<{ key: string; label: string; value: number }> = [
    { key: "lcp", label: "LCP", value: vitals.lcp },
    { key: "fcp", label: "FCP", value: vitals.fcp },
    { key: "cls", label: "CLS", value: vitals.cls },
    { key: "tbt", label: "TBT", value: vitals.tbt },
  ];

  return (
    <Card className="w-full max-w-4xl mx-auto overflow-hidden">
      <CardHeader className="bg-primary/5 border-b border-primary/10 p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl flex items-center gap-2 text-primary font-semibold tracking-tight">
              <Zap className="h-5 w-5 text-primary/70" />
              Performance Audit
            </CardTitle>
            <CardDescription className="text-muted-foreground truncate max-w-md text-xs">
              {url}
            </CardDescription>
          </div>
          {scorecard && (
            <Badge
              variant="outline"
              className="bg-primary/8 text-primary border-primary/25 px-3 py-1 font-medium"
            >
              Analysis Active
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {vitalEntries.map(({ key, label, value }) => {
            const rating = rateVital(key, value);
            const Icon = VITAL_ICONS[key];
            return (
              <div
                key={key}
                className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-4 transition-all hover:bg-accent hover:border-primary/20 shadow-sm"
              >
                <div className="flex items-center gap-2 mb-2">
                  {Icon && <Icon className="h-4 w-4 text-primary/60" />}
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {label}
                  </span>
                </div>
                <div className="text-2xl font-bold mb-2 text-slate-700">
                  {formatUnit(key, value)}
                </div>
                <Badge
                  variant={RATING_VARIANTS[rating]}
                  className="capitalize text-xs"
                >
                  {rating.replace("-", " ")}
                </Badge>
              </div>
            );
          })}
        </div>

        <div className="flex items-start gap-3 rounded-lg border bg-slate-50 p-4 dark:bg-slate-900/50">
          <Info className="h-5 w-5 text-blue-500 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold">
              Largest Contentful Paint (LCP) Element
            </p>
            <code className="block text-xs text-blue-600 dark:text-blue-400 break-all bg-blue-50 dark:bg-blue-900/30 p-2 rounded border border-blue-100 dark:border-blue-800">
              {lcpElement}
            </code>
          </div>
        </div>

        {scorecard && (
          <div className="rounded-xl border border-green-200 bg-green-50/50 p-6 dark:border-green-900/30 dark:bg-green-900/10">
            <h3 className="text-sm font-bold text-green-800 dark:text-green-400 mb-4 flex items-center gap-2 italic uppercase">
              <Zap className="h-4 w-4 fill-current" />
              Optimization Impact
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-medium">
                  LCP Improvement
                </p>
                <p
                  className={`text-2xl font-black ${scorecard.improvements.lcp_saved_ms > 0 ? "text-green-600" : "text-amber-600"}`}
                >
                  {scorecard.improvements.lcp_saved_ms > 0 ? "−" : "+"}
                  {Math.abs(scorecard.improvements.lcp_saved_ms)} ms
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase font-medium">
                  Network Savings
                </p>
                <p
                  className={`text-2xl font-black ${scorecard.improvements.bytes_saved_kb > 0 ? "text-green-600" : "text-amber-600"}`}
                >
                  {scorecard.improvements.bytes_saved_kb > 0 ? "−" : "+"}
                  {Math.abs(scorecard.improvements.bytes_saved_kb)} KB
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
