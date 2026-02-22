import type { AuditData, CSSCoverageReport } from "./types/index.js";

const DEFAULT_MAX_CHARS = 4096;

interface AIPromptPayload {
  context: {
    url: string;
    timestamp: string;
    viewport: { width: number; height: number } | null;
  };
  performance: {
    vitals: AuditData["vitals"];
    css_bloat: CSSCoverageReport[];
    main_thread_bottlenecks: AuditData["longTasks"];
    asset_priorities: AuditData["priorityDock"];
  };
  selectors_to_fix: {
    layout_shifts: string[];
    lcp_element: string;
  };
}

/**
 * Progressively prune the AI prompt payload until it fits within the token budget.
 *
 * Pruning order (least valuable first):
 * 1. Drop CSS bloat entries beyond 3
 * 2. Drop asset_priorities entries beyond 7
 * 3. Drop stackHint entries beyond the first function name
 * 4. Drop main_thread_bottlenecks beyond 3
 * 5. Drop asset_priorities beyond 5
 */
export const prunePayload = (
  payload: AIPromptPayload,
  maxChars = DEFAULT_MAX_CHARS,
): AIPromptPayload => {
  const pruned = structuredClone(payload);
  const steps: Array<() => void> = [
    () => {
      pruned.performance.css_bloat = pruned.performance.css_bloat.slice(0, 3);
    },
    () => {
      pruned.performance.asset_priorities =
        pruned.performance.asset_priorities.slice(0, 7);
    },
    () => {
      for (const task of pruned.performance.main_thread_bottlenecks) {
        task.stackHint = task.stackHint.slice(0, 1);
      }
    },
    () => {
      pruned.performance.main_thread_bottlenecks =
        pruned.performance.main_thread_bottlenecks.slice(0, 3);
    },
    () => {
      pruned.performance.asset_priorities =
        pruned.performance.asset_priorities.slice(0, 5);
    },
  ];

  for (const step of steps) {
    if (JSON.stringify(pruned).length <= maxChars) break;
    step();
  }

  return pruned;
};

export type { AIPromptPayload };
