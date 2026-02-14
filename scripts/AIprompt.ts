import { Page } from "playwright";
import { getCSSShakerData } from "./CSSCoverageReport";
import type { AuditData } from "./types/index.js";

export const generateAIPromptPayload = async (page: Page, auditData: AuditData) => {
  const cssShaker = await getCSSShakerData(page);
  const finalPayload = {
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
      layout_shifts:
        auditData.shiftAttribution?.map((s) => s.selector) || [],
      lcp_element: "Use trace to identify LCP candidate",
    },
  };

  return JSON.stringify(finalPayload, null, 2);
};
