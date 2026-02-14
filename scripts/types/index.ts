import type { PerformanceEntry } from "perf_hooks";

export interface ShiftAttribution {
  selector: string;
  score: number;
  prevRect: DOMRectReadOnly;
  currRect: DOMRectReadOnly;
}

export interface PerformanceReport {
  vitals: { lcp: number; cls: number; fcp: number };
  longTasks: Array<{
    duration_ms: number;
    scriptUrl: string;
    stackHint: string[];
    isThirdParty: boolean;
  }>;
  priorityDock: Array<{
    url: string;
    transferSizeKb: number;
    priority: string;
    initiator: string;
    ttfb_ms: number;
  }>;
  tracePath: string;
}

export interface NetworkInfo {
  priority: string;
  initiator: string;
}

export interface AuditData {
  vitals: { lcp: number; cls: number; fcp: number };
  longTasks: Array<{
    duration_ms: number;
    scriptUrl: string;
    stackHint: string[];
    isThirdParty: boolean;
  }>;
  priorityDock: Array<{
    url: string;
    transferSizeKb: number;
    priority: string;
    initiator: string;
    ttfb_ms: number;
  }>;
  shiftAttribution?: ShiftAttribution[];
}

export interface CSSCoverageReport {
  url: string;
  totalBytes: number;
  unusedBytes: number;
  unusedPercentage: number;
  unusedRulesSnippet: string;
}

export interface LayoutShift extends PerformanceEntry {
  hadRecentInput: boolean;
  value: number;
  sources?: Array<{
    node: Element;
    previousRect: DOMRectReadOnly;
    currentRect: DOMRectReadOnly;
  }>;
}

export interface ResourceTiming {
  name: string;
  url: string;
  transferSize: number;
  responseStart: number;
  ttfb: number;
}

export function isLayoutShift(entry: PerformanceEntry): entry is LayoutShift {
  return (
    "hadRecentInput" in entry &&
    "value" in entry
  );
}
