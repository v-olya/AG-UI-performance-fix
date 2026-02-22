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
import { cn } from "@/app/lib/utils";
import {
  Zap,
  Activity,
  Type,
  MousePointer2,
  Info,
  CircleHelp,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

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

const VITAL_INFO: Record<string, { fullLabel: string; description: string }> = {
  lcp: {
    fullLabel: "Largest Contentful Paint",
    description: "Time for the largest content element to become visible.",
  },
  fcp: {
    fullLabel: "First Contentful Paint",
    description: "Time until the first bit of content is rendered.",
  },
  cls: {
    fullLabel: "Cumulative Layout Shift",
    description: "Measures unexpected layout shifts during loading.",
  },
  tbt: {
    fullLabel: "Total Blocking Time",
    description: "Duration of input blocking by long tasks.",
  },
};

const VITAL_ICONS: Record<string, typeof Zap> = {
  lcp: Zap,
  fcp: Activity,
  cls: Type,
  tbt: MousePointer2,
};

const formatUnit = (key: string, value: number): string => {
  if (key === "cls") return value.toFixed(3);
  return `${Math.round(value)} ms`;
};

const getRatingDescription = (key: string, rating: VitalRating): string => {
  const t = THRESHOLDS[key];
  if (!t) return "";

  const unit = key === "cls" ? "" : " ms";

  switch (rating) {
    case "good":
      return `Great performance: below the ${t.good}${unit} threshold.`;
    case "needs-improvement":
      return `Needs optimization: target is below ${t.good}${unit}.`;
    case "poor":
      return `Poor performance: exceeds ${t.poor}${unit} baseline.`;
    default:
      return "";
  }
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

      <TooltipProvider delayDuration={100}>
        <CardContent className="p-6 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {vitalEntries.map(({ key, label, value }) => {
              const rating = rateVital(key, value);
              const Icon = VITAL_ICONS[key];
              const info = VITAL_INFO[key];

              return (
                <div
                  key={key}
                  className="flex flex-col items-center justify-center rounded-xl border border-border bg-card p-5 transition-all hover:bg-accent/50 hover:border-primary/20 shadow-sm"
                >
                  <div className="flex items-center gap-2 mb-3">
                    {Icon && (
                      <Icon
                        className="h-4 w-4 text-primary/70"
                        strokeWidth={2.5}
                      />
                    )}
                    <span className="text-sm font-semibold uppercase tracking-tight text-foreground">
                      {label}
                    </span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="inline-flex items-center justify-center rounded-full p-0.5 hover:bg-muted transition-colors">
                          <CircleHelp className="h-3.5 w-3.5 text-muted-foreground/60" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[200px] text-center p-3">
                        <p className="font-bold mb-1">{info?.fullLabel}</p>
                        <p className="font-normal text-muted-foreground">
                          {info?.description}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  <div className="text-xl font-bold mb-3 tracking-tight text-slate-900 dark:text-slate-100">
                    {formatUnit(key, value)}
                  </div>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-help w-full flex justify-center">
                        <Badge
                          variant={RATING_VARIANTS[rating]}
                          className={cn(
                            "capitalize text-[11px] px-3 py-0.5 font-bold tracking-tight shadow-sm transition-transform hover:scale-105",
                            rating === "poor" &&
                              "bg-red-700 hover:bg-red-800 text-white border-red-800/50",
                          )}
                        >
                          {rating.replace("-", " ")}
                        </Badge>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent className="text-center max-w-[200px] p-3 shadow-xl border-2">
                      <p className="font-medium leading-relaxed">
                        {getRatingDescription(key, rating)}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              );
            })}
          </div>

          <Alert className="bg-slate-50 dark:bg-slate-900/50 border-border">
            <Info className="h-4 w-4 text-blue-500" />
            <AlertTitle className="text-sm font-semibold mb-2">
              Largest Contentful Paint (LCP) Element
            </AlertTitle>
            <AlertDescription>
              <code className="block text-xs text-blue-600 dark:text-blue-400 break-all bg-blue-50 dark:bg-blue-900/30 p-2.5 rounded-md border border-blue-100 dark:border-blue-800 font-mono">
                {lcpElement}
              </code>
            </AlertDescription>
          </Alert>

          {scorecard && (
            <div className="rounded-xl border border-green-200/50 bg-green-50/30 p-6 dark:border-green-900/20 dark:bg-green-900/5">
              <h3 className="text-xs font-bold text-green-800 dark:text-green-400 mb-5 flex items-center gap-2 tracking-widest uppercase">
                <Zap className="h-3.5 w-3.5 fill-current" />
                Optimization Impact
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    LCP Improvement
                  </p>
                  <p
                    className={`text-xl font-bold tracking-tight ${scorecard.improvements.lcp_saved_ms > 0 ? "text-green-600" : "text-amber-600"}`}
                  >
                    {scorecard.improvements.lcp_saved_ms > 0 ? "−" : "+"}
                    {Math.abs(scorecard.improvements.lcp_saved_ms)} ms
                  </p>
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                    Network Savings
                  </p>
                  <p
                    className={`text-xl font-bold tracking-tight ${scorecard.improvements.bytes_saved_kb > 0 ? "text-green-600" : "text-amber-600"}`}
                  >
                    {scorecard.improvements.bytes_saved_kb > 0 ? "−" : "+"}
                    {Math.abs(scorecard.improvements.bytes_saved_kb)} KB
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </TooltipProvider>
    </Card>
  );
}
