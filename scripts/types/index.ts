export type SectionType =
  | "SCRIPT_SANDBOX"
  | "LAYOUT_SHIFT"
  | "PRIORITY_DOCK"
  | "EXECUTION_SPLITTER";

export interface ShiftAttribution {
  selector: string;
  score: number;
  prevRect: DOMRectReadOnly;
  currRect: DOMRectReadOnly;
}

export interface Vitals {
  lcp: number;
  cls: number;
  fcp: number;
  tbt: number;
}

export interface LongTask {
  approxDuration_ms: number;
  scriptUrl: string;
  fullScriptUrl?: string;
  stackHint: string[];
  isThirdParty: boolean;
  sourceSnippet?: string;
  lineNumber?: number;
  lineOffset?: number; // Starting line number of the snippet in original file
}

export type ResourceType = "script" | "css" | "font" | "img" | "other";

export interface PriorityDockEntry {
  basename: string;
  fullUrl: string;
  transferSizeKb: number;
  priority: string;
  initiator: string;
  ttfb_ms: number;
  type: ResourceType;
}

export interface PerformanceReport {
  vitals: Vitals;
  longTasks: LongTask[];
  priorityDock: PriorityDockEntry[];
  lcpElement: string;
  tracePath: string;
}

export interface NetworkInfo {
  priority: string;
  initiator: string;
}

export interface AuditData {
  vitals: Vitals;
  longTasks: LongTask[];
  priorityDock: PriorityDockEntry[];
  lcpElement: string;
  shiftAttribution?: ShiftAttribution[];
}

export interface CSSCoverageReport {
  url: string;
  totalBytes: number;
  unusedBytes: number;
  unusedKb: number;
  unusedPercentage: number;
}

export interface ResourceTiming {
  name: string;
  url: string;
  transferSize: number;
  responseStart: number;
  ttfb: number;
}
