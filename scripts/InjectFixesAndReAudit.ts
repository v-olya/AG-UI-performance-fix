import { chromium, Browser, BrowserContext, Page, Route } from "playwright";
import * as prettier from "prettier";
import { minify } from "terser";

export interface AIProposedFix {
  type: "head_injection" | "css_override" | "js_replace";
  targetFileUrl?: string; // Only required for 'js_replace'
  content: string;
}

export interface MetricScore {
  lcp_ms: number;
  total_bytes_kb: number;
}

export interface ScorecardDelta {
  before: MetricScore;
  after: MetricScore;
  improvements: {
    lcp_saved_ms: number;
    bytes_saved_kb: number;
  };
}

// HELPER
const measurePage = async (page: Page): Promise<MetricScore> => {
  return await page.evaluate(async () => {
    // Type assertion to avoid 'any'
    const resources = performance.getEntriesByType(
      "resource",
    ) as PerformanceResourceTiming[];
    const totalBytes = resources.reduce(
      (acc, r) => acc + (r.transferSize || 0),
      0,
    );

    const lcp = await new Promise<number>((resolve) => {
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          resolve(entries[entries.length - 1]?.startTime || 0);
        }
      }).observe({ type: "largest-contentful-paint", buffered: true });

      setTimeout(() => resolve(0), 3000); // TODO tie this resolution to Playwright's networkidle state
    });

    return {
      lcp_ms: Math.round(lcp),
      total_bytes_kb: Math.round(totalBytes / 1024),
    };
  });
};

// SCORECARD
export const generateScorecard = async (
  url: string,
  beforeMetrics: MetricScore,
  fixes: AIProposedFix[],
): Promise<ScorecardDelta> => {
  const browser: Browser = await chromium.launch();
  const context: BrowserContext = await browser.newContext();
  const page: Page = await context.newPage();

  // 1. Apply Network Interception Fixes (Replacing JS files or injecting into HTML)
  await page.route("**/*", async (route: Route) => {
    const request = route.request();
    const reqUrl = request.url();

    // A. Inject HTML <head> tags (Preloads, FetchPriority)
    if (reqUrl === url) {
      const headFixes = fixes
        .filter((f) => f.type === "head_injection")
        .map((f) => f.content)
        .join("\n");
      const response = await route.fetch();
      let html = await response.text();

      if (headFixes) {
        html = html.replace("</head>", `${headFixes}\n</head>`);
      }
      return route.fulfill({
        response,
        body: html,
        headers: { ...response.headers(), "content-type": "text/html" },
      });
    }

    // B. Smart Patch specific JS/CSS files
    const replaceFix = fixes.find(
      (f) =>
        f.type === "js_replace" &&
        f.targetFileUrl &&
        reqUrl.includes(f.targetFileUrl),
    );
    if (replaceFix) {
      const response = await route.fetch();
      const body = await response.text();

      const isMinified =
        body.split("\n").some((l) => l.length > 500) ||
        (body.length > 1000 && body.split("\n").length < 10);

      let workingBody = body;
      if (isMinified) {
        try {
          workingBody = await prettier.format(body, {
            parser: "babel",
            semi: true,
            singleQuote: true,
          });
        } catch (e) {
          console.warn("Beautification failed, patching original source.");
        }
      }

      // Apply fix (Patch or Replace)
      const patchMatch = replaceFix.content.match(/\/\* Line (\d+) \*\/ (.*)/);
      if (patchMatch) {
        const lineNum = parseInt(patchMatch[1]!, 10);
        const patchCode = patchMatch[2]!;
        const lines = workingBody.split("\n");
        lines.splice(lineNum, 0, patchCode);
        workingBody = lines.join("\n");
      } else {
        workingBody = replaceFix.content;
      }

      if (isMinified) {
        try {
          const minified = await minify(workingBody);
          workingBody = minified.code || workingBody;
        } catch (e) {
          console.warn("Re-minification failed.");
        }
      }

      return route.fulfill({
        status: 200,
        contentType: reqUrl.endsWith(".css")
          ? "text/css"
          : "application/javascript",
        body: workingBody,
      });
    }

    // Otherwise, let the request go through normally
    await route.continue();
  });

  // 2. Apply DOM Injection Fixes (New CSS Overrides)
  const cssFixes = fixes.filter((f) => f.type === "css_override");
  for (const fix of cssFixes) {
    // This injects the CSS string directly into the page's stylesheet context
    await page.addInitScript(`
      const style = document.createElement('style');
      style.textContent = \`${fix.content}\`;
      document.addEventListener('DOMContentLoaded', () => document.head.appendChild(style));
    `);
  }

  // 3. Navigate and Measure the "After" State
  await page.goto(url, { waitUntil: "load" });
  const afterMetrics = await measurePage(page);

  await browser.close();

  // 4. Return the Scorecard Delta
  return {
    before: beforeMetrics,
    after: afterMetrics,
    improvements: {
      lcp_saved_ms: beforeMetrics.lcp_ms - afterMetrics.lcp_ms,
      bytes_saved_kb:
        beforeMetrics.total_bytes_kb - afterMetrics.total_bytes_kb,
    },
  };
};
