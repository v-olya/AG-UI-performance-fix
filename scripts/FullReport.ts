import { BrowserContext, Page, CDPSession } from "playwright";
import type { PerformanceReport, NetworkInfo, ResourceTiming } from "./types/index.js";

export const runFullAudit = async (
  context: BrowserContext,
  url: string,
): Promise<PerformanceReport> => {
  // 1. Start Tracing (Captures screenshots + layout shift events)
  const tracePath = `trace-${Date.now()}.zip`;
  await context.tracing.start({ screenshots: true, snapshots: true });

  const page: Page = await context.newPage();
  const client: CDPSession = await page.context().newCDPSession(page);

  // 2. Setup CDP for Network & Profiling
  await client.send("Network.enable");
  await client.send("Profiler.enable");
  await client.send("Profiler.start");

  const networkMap = new Map<string, NetworkInfo>();
  client.on("Network.requestWillBeSent", (params) => {
    networkMap.set(params.request.url, {
      priority: params.request.initialPriority,
      initiator: params.initiator.type,
    });
  });

  // Navigate and wait for stability
  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(2000); // Allow LCP/CLS to settle

  // 3. Extract Web Vitals & Resource Timing
  const metrics = await page.evaluate(async () => {
    type LayoutShift = PerformanceEntry & { hadRecentInput: boolean; value: number };

    const getLCP = (): Promise<number> =>
      new Promise((res) => {
        new PerformanceObserver((l) => {
          const entries = l.getEntries();
          if (entries.length > 0) {
            res(entries[entries.length - 1]?.startTime || 0);
          } else {
            res(0);
          }
        }).observe({ type: "largest-contentful-paint", buffered: true });
        setTimeout(() => res(0), 1000);
      });

    const getCLS = (): Promise<number> =>
      new Promise((res) => {
        let score = 0;
        new PerformanceObserver((l) => {
          const entries = l.getEntries();
          for (const entry of entries) {
            // Type guard: check for layout shift properties
            if (
              entry &&
              "hadRecentInput" in entry &&
              !entry.hadRecentInput &&
              "value" in entry
            ) {
              score += (entry as LayoutShift).value;
            }
          }
        }).observe({ type: "layout-shift", buffered: true });
        setTimeout(() => res(score), 1000);
      });

    const getResourceTiming = (): ResourceTiming[] => {
      const resources = performance.getEntriesByType("resource");
      return resources.map((r) => ({
        name: r.name,
        url: r.name,
        transferSize: (r as PerformanceResourceTiming).transferSize,
        responseStart: (r as PerformanceResourceTiming).responseStart,
        ttfb: (r as PerformanceResourceTiming).responseStart,
      }));
    };

    const [lcp, cls, resources] = await Promise.all([getLCP(), getCLS(), getResourceTiming()]);
    const fcp =
      performance.getEntriesByName("first-contentful-paint")[0]?.startTime || 0;

    return {
      lcp,
      cls,
      fcp,
      resources,
    };
  });

  // 4. Stop Profiler & Process Callstacks
  const { profile } = await client.send("Profiler.stop");
  const targetHost = new URL(url).hostname;

  // Map profile nodes to readable "Long Task" candidates
  const longTasks = profile.nodes
    .filter((node) => node.callFrame.url !== "") // Ignore internal browser code
    .slice(0, 8) // Get top 8 offenders
    .map((node) => ({
      duration_ms: 0, // In a real profiler this requires sample counting, but stack is more vital for AI
      scriptUrl: node.callFrame.url,
      isThirdParty: !node.callFrame.url.includes(targetHost),
      stackHint: [
        node.callFrame.functionName || "(anonymous)",
        ...(node.children?.slice(0, 2).map((c) => {
          const child = profile.nodes.find((n) => n.id === c);
          return child?.callFrame.functionName || "sub-process";
        }) || []),
      ],
    }));

  // 5. Finalize Priority Dock
  const priorityDock = metrics.resources
    .map((res) => ({
      url: res.url,
      transferSizeKb: Math.round(res.transferSize / 1024),
      priority: networkMap.get(res.url)?.priority || "Unknown",
      initiator: networkMap.get(res.url)?.initiator || "Unknown",
      ttfb_ms: Math.round(res.ttfb),
    }))
    .sort((a, b) => b.transferSizeKb - a.transferSizeKb)
    .slice(0, 15);

  // Stop Tracing
  await context.tracing.stop({ path: tracePath });

  return {
    vitals: { lcp: metrics.lcp, cls: metrics.cls, fcp: metrics.fcp },
    longTasks,
    priorityDock,
    tracePath,
  };
};
