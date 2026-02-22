import { BrowserContext, Page, CDPSession } from "playwright";
import type {
  PerformanceReport,
  NetworkInfo,
  ResourceTiming,
  ResourceType,
  LongTask,
  PriorityDockEntry,
} from "./types/index.js";

const MAX_LONG_TASKS = 5;
const MAX_PRIORITY_DOCK_ENTRIES = 10;
const MIN_RESOURCE_SIZE_KB = 2;
const LCP_SETTLE_TIMEOUT_MS = 2000;

const inferResourceType = (url: string): ResourceType => {
  const ext = url.split("?")[0]?.split(".").pop()?.toLowerCase() ?? "";
  if (["js", "mjs", "cjs"].includes(ext)) return "script";
  if (["css"].includes(ext)) return "css";
  if (["woff", "woff2", "ttf", "otf", "eot"].includes(ext)) return "font";
  if (["png", "jpg", "jpeg", "gif", "webp", "avif", "svg", "ico"].includes(ext))
    return "img";
  return "other";
};

const extractBasename = (url: string): string => {
  try {
    return new URL(url).pathname.split("/").pop() || url;
  } catch {
    return url.split("/").pop() || url;
  }
};

export const runFullAudit = async (
  context: BrowserContext,
  url: string,
): Promise<PerformanceReport> => {
  const tracePath = `trace-${Date.now()}.zip`;
  await context.tracing.start({ screenshots: true, snapshots: true });

  const page: Page = await context.newPage();
  const client: CDPSession = await page.context().newCDPSession(page);

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

  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(LCP_SETTLE_TIMEOUT_MS);

  const metrics = await page.evaluate(async () => {
    type LayoutShiftEntry = PerformanceEntry & {
      hadRecentInput: boolean;
      value: number;
    };

    type LCPEntry = PerformanceEntry & {
      startTime: number;
      element: Element | null;
    };

    const getLCP = (): Promise<{ time: number; selector: string }> =>
      new Promise((res) => {
        new PerformanceObserver((l) => {
          const entries = l.getEntries() as unknown as LCPEntry[];
          if (entries.length > 0) {
            const last = entries[entries.length - 1];
            const el = last?.element;
            let selector = "unknown";
            if (el) {
              if (el.id) {
                selector = `#${el.id}`;
              } else {
                selector = `${el.tagName.toLowerCase()}${el.className ? "." + String(el.className).split(" ").filter(Boolean).join(".") : ""}`;
              }
            }
            res({ time: last?.startTime || 0, selector });
          } else {
            res({ time: 0, selector: "unknown" });
          }
        }).observe({ type: "largest-contentful-paint", buffered: true });
        setTimeout(() => res({ time: 0, selector: "unknown" }), 1000);
      });

    const getCLS = (): Promise<number> =>
      new Promise((res) => {
        let score = 0;
        new PerformanceObserver((l) => {
          const entries = l.getEntries();
          for (const entry of entries) {
            if (
              entry &&
              "hadRecentInput" in entry &&
              !entry.hadRecentInput &&
              "value" in entry
            ) {
              score += (entry as unknown as LayoutShiftEntry).value;
            }
          }
        }).observe({ type: "layout-shift", buffered: true });
        setTimeout(() => res(score), 1000);
      });

    const getTBT = (): Promise<number> =>
      new Promise((res) => {
        let tbt = 0;
        new PerformanceObserver((l) => {
          for (const entry of l.getEntries()) {
            const blocking = entry.duration - 50;
            if (blocking > 0) tbt += blocking;
          }
        }).observe({ type: "longtask", buffered: true });
        setTimeout(() => res(tbt), 1000);
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

    const [lcp, cls, tbt, resources] = await Promise.all([
      getLCP(),
      getCLS(),
      getTBT(),
      getResourceTiming(),
    ]);

    const fcp =
      performance.getEntriesByName("first-contentful-paint")[0]?.startTime || 0;

    return {
      lcp: lcp.time,
      lcpSelector: lcp.selector,
      cls,
      fcp,
      tbt,
      resources,
    };
  });

  const { profile } = await client.send("Profiler.stop");
  const targetHost = new URL(url).hostname;

  const totalSamples = profile.samples?.length || 1;
  const profileDuration = profile.endTime - profile.startTime;

  const longTasks: LongTask[] = profile.nodes
    .filter((node) => node.callFrame.url !== "" && (node.hitCount ?? 0) > 0)
    .sort((a, b) => (b.hitCount ?? 0) - (a.hitCount ?? 0))
    .slice(0, MAX_LONG_TASKS)
    .map((node) => ({
      approxDuration_ms: Math.round(
        ((node.hitCount ?? 0) / totalSamples) * (profileDuration / 1000),
      ),
      scriptUrl: extractBasename(node.callFrame.url),
      isThirdParty: !node.callFrame.url.includes(targetHost),
      stackHint: [
        node.callFrame.functionName || "(anonymous)",
        ...(node.children?.slice(0, 2).map((c) => {
          const child = profile.nodes.find((n) => n.id === c);
          return child?.callFrame.functionName || "sub-process";
        }) || []),
      ],
    }));

  const priorityDock: PriorityDockEntry[] = metrics.resources
    .map((res) => {
      const sizeKb = Math.round(res.transferSize / 1024);
      return {
        basename: extractBasename(res.url),
        fullUrl: res.url,
        transferSizeKb: sizeKb,
        priority: networkMap.get(res.url)?.priority || "Unknown",
        initiator: networkMap.get(res.url)?.initiator || "Unknown",
        ttfb_ms: Math.round(res.ttfb),
        type: inferResourceType(res.url),
      };
    })
    .filter((entry) => entry.transferSizeKb >= MIN_RESOURCE_SIZE_KB)
    .sort((a, b) => b.transferSizeKb - a.transferSizeKb)
    .slice(0, MAX_PRIORITY_DOCK_ENTRIES);

  await context.tracing.stop({ path: tracePath });

  return {
    vitals: {
      lcp: metrics.lcp,
      cls: metrics.cls,
      fcp: metrics.fcp,
      tbt: metrics.tbt,
    },
    longTasks,
    priorityDock,
    lcpElement: metrics.lcpSelector,
    tracePath,
  };
};
