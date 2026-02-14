"use client";

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
}

export interface PerformanceIssue {
  type: string;
  severity: "low" | "medium" | "high";
  description: string;
  recommendation?: string;
}

export interface AnalysisResult {
  url: string;
  score: number;
  metrics: PerformanceMetric[];
  issues: PerformanceIssue[];
}
