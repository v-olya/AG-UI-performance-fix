import { Page } from "playwright";
import type { ShiftAttribution } from "./types/index.js";

export const extractLayoutShiftAttribution = async (
  page: Page,
): Promise<ShiftAttribution[]> => {
  return await page.evaluate(() => {
    return new Promise((resolve) => {
      // See scripts/types/performance.ts for type definitions
      type LayoutShift = PerformanceEntry & {
        hadRecentInput: boolean;
        sources: Array<{
          node: Element;
          previousRect: DOMRectReadOnly;
          currentRect: DOMRectReadOnly;
        }>;
        value: number;
      };

      const shiftMap = new Map<string, number>();
      const rectMap = new Map<
        string,
        { prev: DOMRectReadOnly; curr: DOMRectReadOnly }
      >();

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as LayoutShift;
          if (shift.hadRecentInput || !shift.sources) continue;

          // For each shift, find the most "specific" source (deepest node)
          let bestSource: {
            node: Element;
            prevRect: DOMRectReadOnly;
            currentRect: DOMRectReadOnly;
          } | null = null;
          let maxDepth = -1;
          let maxArea = -1;

          const getDepth = (el: Element) => {
            let depth = 0;
            let current: Element | null = el;
            while (current?.parentElement) {
              depth++;
              current = current.parentElement;
            }
            return depth;
          };

          for (const source of shift.sources) {
            if (!source.node || source.node.nodeType !== 1) continue;
            const el = source.node as Element;
            if (el.tagName === "HTML" || el.tagName === "BODY") continue;

            const depth = getDepth(el);
            const area = source.currentRect.width * source.currentRect.height;

            // Primary criteria: Depth (identify the most specific "leaf" node shifting)
            // Secondary criteria: Largest Area among deepest nodes (highest visual impact)
            if (depth > maxDepth || (depth === maxDepth && area > maxArea)) {
              maxDepth = depth;
              maxArea = area;
              bestSource = {
                node: el,
                prevRect: source.previousRect,
                currentRect: source.currentRect,
              };
            }
          }

          if (bestSource) {
            const el = bestSource.node as Element;
            const selector = el.id
              ? `#${el.id}`
              : `${el.tagName.toLowerCase()}${el.className ? "." + String(el.className).split(" ").filter(Boolean).join(".") : ""}`;

            shiftMap.set(selector, (shiftMap.get(selector) || 0) + shift.value);
            rectMap.set(selector, {
              prev: bestSource.prevRect,
              curr: bestSource.currentRect,
            });
          }
        }
      });

      observer.observe({ type: "layout-shift", buffered: true });

      setTimeout(() => {
        observer.disconnect();
        const results: ShiftAttribution[] = Array.from(shiftMap.entries())
          .map(([selector, score]) => ({
            selector,
            score,
            prevRect: rectMap.get(selector)!.prev,
            currRect: rectMap.get(selector)!.curr,
          }))
          .sort((a, b) => b.score - a.score)
          .slice(0, 8); // Increased limit as AI can handle more context now
        resolve(results);
      }, 1500); // Increased from 600ms for better reliability
    });
  });
};
