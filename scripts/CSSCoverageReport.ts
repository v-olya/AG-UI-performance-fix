import { Page } from "playwright";
import type { CSSCoverageReport } from "./types/index.js";

const MAX_CSS_ENTRIES = 5;
const MIN_UNUSED_PERCENTAGE = 50;

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
        unusedKb: Math.round(unusedBytes / 1024),
        unusedPercentage:
          totalBytes > 0 ? Math.round((unusedBytes / totalBytes) * 100) : 0,
      };
    })
    .filter((report) => report.unusedPercentage > MIN_UNUSED_PERCENTAGE)
    .sort((a, b) => b.unusedBytes - a.unusedBytes)
    .slice(0, MAX_CSS_ENTRIES);
};
