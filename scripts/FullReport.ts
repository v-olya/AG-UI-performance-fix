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
const LCP_SETTLE_TIMEOUT_MS = 2000;

const inferResourceType = (
  url: string,
  targetUrl: string,
): ResourceType | null => {
  const urlObj = new URL(url);
  const targetUrlObj = new URL(targetUrl);
  // Match exact base URL to target URL representing the document
  if (
    urlObj.origin === targetUrlObj.origin &&
    urlObj.pathname === targetUrlObj.pathname
  )
    return null;
  const ext = urlObj.pathname.split(".").pop()?.toLowerCase() ?? "";
  if (["js", "mjs", "cjs"].includes(ext)) return "script";
  if (["css"].includes(ext)) return "css";
  if (["woff", "woff2", "ttf", "otf", "eot"].includes(ext)) return "font";
  if (["png", "jpg", "jpeg", "gif", "webp", "avif", "svg", "ico"].includes(ext))
    return "img";
  return null;
};

const extractBasename = (url: string): string => {
  try {
    const urlObj = new URL(url);
    let name = urlObj.pathname.split("/").pop() || urlObj.hostname;
    // Keep some query for fonts or dynamic scripts if short
    if (urlObj.search && urlObj.search.length < 20) {
      name += urlObj.search;
    }
    return name.substring(0, 50); // Cap basename length
  } catch {
    return url.split("/").pop()?.substring(0, 50) || url.substring(0, 50);
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
  await client.send("Network.clearBrowserCache");
  await client.send("Profiler.enable");
  await client.send("Profiler.start");

  const networkMap = new Map<string, NetworkInfo>();
  const requestFinishedPromises: Promise<void>[] = [];

  client.on("Network.requestWillBeSent", (params) => {
    const url = params.request.url?.split("#")[0] ?? "";
    if (url && !networkMap.has(url)) {
      networkMap.set(url, {
        priority: params.request.initialPriority,
        initiator: params.initiator.type,
      });
    }
  });

  page.on("requestfinished", (req) => {
    requestFinishedPromises.push(
      (async () => {
        try {
          const sizes = await req.sizes();
          const timing = req.timing();
          const url = req.url()?.split("#")[0] ?? "";
          if (!url) return;
          const info = networkMap.get(url);
          if (info) {
            info.encodedDataLength = sizes.responseBodySize;
            // total duration = responseEnd
            if (timing.responseEnd > 0) {
              info.duration_ms = Math.round(timing.responseEnd);
            }
          }
        } catch {
          // Ignore if request sizes can't be fetched
        }
      })(),
    );
  });

  await page.goto(url, { waitUntil: "load" });
  await page.waitForTimeout(LCP_SETTLE_TIMEOUT_MS);
  await Promise.allSettled(requestFinishedPromises);

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
      const resources = performance.getEntriesByType(
        "resource",
      ) as PerformanceResourceTiming[];
      return resources.map((r) => ({
        name: r.name,
        url: r.name,
        transferSize: r.transferSize || r.encodedBodySize || 0,
        startTime: r.startTime,
        responseStart: r.responseStart,
        responseEnd: r.responseEnd,
        duration: r.duration,
      }));
    };

    const getLoadingHints = (): Record<string, string> => {
      const hints = new Map<string, string>();
      document.querySelectorAll("script[src]").forEach((s) => {
        if (s.hasAttribute("async"))
          hints.set(s.getAttribute("src") || "", "async");
        else if (s.hasAttribute("defer"))
          hints.set(s.getAttribute("src") || "", "defer");
      });
      document.querySelectorAll('link[rel="preload"]').forEach((l) => {
        hints.set(l.getAttribute("href") || "", "preload");
      });
      document.querySelectorAll('link[rel="prefetch"]').forEach((l) => {
        hints.set(l.getAttribute("href") || "", "prefetch");
      });
      document.querySelectorAll('[fetchpriority="high"]').forEach((el) => {
        hints.set(
          el.getAttribute("src") || el.getAttribute("href") || "",
          'fetchpriority="high"',
        );
      });

      const root = new URL(document.baseURI);
      const output: Record<string, string> = {};
      hints.forEach((hint, url) => {
        if (!url) return;
        try {
          output[new URL(url, root).href] = hint;
        } catch {
          // ignore invalid URLs
        }
      });
      return output;
    };

    const [lcp, cls, tbt, resources] = await Promise.all([
      getLCP(),
      getCLS(),
      getTBT(),
      getResourceTiming(),
    ]);

    const loadingHints = getLoadingHints();

    const fcp =
      performance.getEntriesByName("first-contentful-paint")[0]?.startTime || 0;

    return {
      lcp: lcp.time,
      lcpSelector: lcp.selector,
      cls,
      fcp,
      tbt,
      resources,
      loadingHints,
    };
  });

  const { profile } = await client.send("Profiler.stop");
  const targetHost = new URL(url).hostname;

  const totalSamples = profile.samples?.length || 1;
  const profileDuration = profile.endTime - profile.startTime;

  const longTasksRaw = profile.nodes
    .filter((node) => node.callFrame.url !== "" && (node.hitCount ?? 0) > 0)
    .sort((a, b) => (b.hitCount ?? 0) - (a.hitCount ?? 0))
    .slice(0, MAX_LONG_TASKS)
    .map((node) => ({
      approxDuration_ms: Math.round(
        ((node.hitCount ?? 0) / totalSamples) * (profileDuration / 1000),
      ),
      scriptUrl: extractBasename(node.callFrame.url),
      fullScriptUrl: node.callFrame.url,
      lineNumber: node.callFrame.lineNumber,
      isThirdParty: !node.callFrame.url.includes(targetHost),
      stackHint: [
        node.callFrame.functionName || "(anonymous)",
        ...(node.children?.slice(0, 2).map((c) => {
          const child = profile.nodes.find((n) => n.id === c);
          return child?.callFrame.functionName || "sub-process";
        }) || []),
      ],
    }));

  // FETCH REAL SOURCE for 1st-party scripts (within a window of the bottleneck line)
  const longTasks: LongTask[] = await Promise.all(
    longTasksRaw.map(async (task) => {
      if (task.isThirdParty || !task.fullScriptUrl) return task;

      try {
        const scriptSource = await page.evaluate(async (url) => {
          try {
            const resp = await fetch(url);
            return await resp.text();
          } catch {
            return null;
          }
        }, task.fullScriptUrl);

        if (scriptSource && task.lineNumber !== undefined) {
          const lines = scriptSource.split("\n");

          // CRITICAL: We DO NOT process minified/single-line scripts for execution splitting.
          const hasLongLine = lines.some((l) => l.length > 250);
          if (lines.length <= 5 || hasLongLine) {
            return task;
          }

          // Standard multi-line script extraction
          const start = Math.max(0, task.lineNumber - 20);
          const end = Math.min(lines.length, task.lineNumber + 50);
          const snippet = lines.slice(start, end).join("\n");

          return {
            ...task,
            sourceSnippet: snippet,
            lineNumber: task.lineNumber - start,
            lineOffset: start,
          };
        }
      } catch (e) {
        console.error("Failed to fetch script source:", e);
      }
      return task;
    }),
  );

  // Merge CDP network events with performance entries to catch resources missing from the performance buffer
  const consolidatedResources = new Map<string, PriorityDockEntry>();

  // First, seed with Network events captured via CDP
  networkMap.forEach((info, urlKey) => {
    // some elements in metrics.resources might be registered with their exact hash URL, try to accommodate.
    const url = urlKey;
    const type = inferResourceType(url, url);
    if (!type) return;

    consolidatedResources.set(url, {
      basename: extractBasename(url),
      fullUrl: url.length > 500 ? url.substring(0, 500) + "..." : url,
      transferSizeKb: Math.round((info.encodedDataLength || 0) / 1024),
      priority: metrics.loadingHints[url] || info.priority || "Unknown",
      initiator: info.initiator || "Unknown",
      ttfb_ms: 0,
      fetchStart_ms: 0,
      duration_ms: info.duration_ms || 0,
      type: type,
    });
  });

  // Then, overwrite with precise timing/size data from performance API where available
  metrics.resources.forEach((res) => {
    const domUrl = (res.url || "").split("#")[0];
    if (!domUrl) return;
    const type = inferResourceType(domUrl, url);
    const existing = consolidatedResources.get(domUrl);

    // Only continue if it's an actionable resource type, OR if we already registered it
    // Wait, if existing hasn't type? It would not be in existing if we rejected it.
    const finalType = type || existing?.type;
    if (!finalType) return;

    const domSizeKb = Math.round(res.transferSize / 1024);
    const finalSizeKb = Math.max(domSizeKb, existing?.transferSizeKb || 0);

    consolidatedResources.set(domUrl, {
      basename: existing?.basename || extractBasename(domUrl),
      fullUrl: domUrl.length > 500 ? domUrl.substring(0, 500) + "..." : domUrl,
      transferSizeKb: finalSizeKb,
      priority:
        metrics.loadingHints[res.url] || existing?.priority || "Unknown",
      initiator: existing?.initiator || "Unknown",
      ttfb_ms: Math.round(res.startTime), // Using startTime as the reliable anchor
      fetchStart_ms: Math.round(res.startTime),
      duration_ms: existing?.duration_ms || Math.round(res.duration),
      type: finalType,
    });
  });

  const priorityDock: PriorityDockEntry[] = Array.from(
    consolidatedResources.values(),
  )
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
