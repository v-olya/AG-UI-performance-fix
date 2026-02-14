import { Page } from "playwright";
import type { CSSCoverageReport } from "./types/index.js";

export const getCSSShakerData = async (
  page: Page,
): Promise<CSSCoverageReport[]> => {
  await page.coverage.startCSSCoverage();
  await page.waitForLoadState("networkidle");

  const coverage = await page.coverage.stopCSSCoverage();

  return coverage
    .map((entry) => {
      const totalBytes = entry.text?.length ?? 0;
      let usedBytes = 0;
      for (const range of entry.ranges) {
        usedBytes += range.end - range.start;
      }

      const unusedBytes = totalBytes - usedBytes;

      return {
        url: entry.url.split("/").pop() || "inline",
        totalBytes,
        unusedBytes,
        unusedPercentage:
          totalBytes > 0 ? Math.round((unusedBytes / totalBytes) * 100) : 0,
        // We send a snippet of the text so the AI can see the class names involved
        unusedRulesSnippet: entry.text?.substring(0, 500) ?? "",
      };
    })
    .filter((report) => report.unusedPercentage > 50); // Only report heavy offenders
};
