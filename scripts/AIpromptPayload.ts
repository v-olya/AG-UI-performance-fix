import { Page } from "playwright";
import { getCSSShakerData } from "./CSSCoverageReport";
import { prunePayload, type AIPromptPayload } from "./TokenBudget";
import type { AuditData } from "./types/index.js";

export const generateAIPromptPayload = async (
  page: Page,
  auditData: AuditData,
): Promise<string> => {
  const cssShaker = await getCSSShakerData(page);

  const payload: AIPromptPayload = {
    context: {
      url: page.url(),
      timestamp: new Date().toISOString(),
      viewport: page.viewportSize(),
    },
    performance: {
      vitals: auditData.vitals,
      css_bloat: cssShaker,
      main_thread_bottlenecks: auditData.longTasks,
      asset_priorities: auditData.priorityDock,
    },
    selectors_to_fix: {
      layout_shifts: auditData.shiftAttribution || [],
      lcp_element: auditData.lcpElement,
    },
  };

  const pruned = prunePayload(payload);
  return JSON.stringify(pruned, null, 2);
};
