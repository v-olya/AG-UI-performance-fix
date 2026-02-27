export type SectionType =
  | "SCRIPT_SANDBOX"
  | "LAYOUT_SHIFT"
  | "PRIORITY_DOCK"
  | "EXECUTION_SPLITTER";

export interface ShiftAttribution {
  selector: string;
  score: number;
  width: number;
  height: number;
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
  columnNumber?: number;
  skipReason?: "too_large" | "incomplete_context" | "minified_no_context";
}

export type ResourceType = "script" | "css" | "font" | "img";

export interface PriorityDockEntry {
  basename: string;
  fullUrl: string;
  transferSizeKb: number;
  priority: string;
  initiator: string;
  ttfb_ms: number;
  fetchStart_ms: number;
  duration_ms: number;
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
  encodedDataLength?: number;
  duration_ms?: number;
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
  startTime: number;
  responseStart: number;
  responseEnd: number;
  duration: number;
}
