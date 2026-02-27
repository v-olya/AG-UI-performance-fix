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
      const rectMap = new Map<string, { width: number; height: number }>();

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as LayoutShift;
          if (shift.hadRecentInput || !shift.sources) continue;

          let bestSource: {
            node: Element;
            width: number;
            height: number;
          } | null = null;

          let firstSource: {
            node: Element;
            prevTop: number;
            prevLeft: number;
            prevRect: DOMRectReadOnly;
            currRect: DOMRectReadOnly;
          } | null = null;

          // 1. Find the primary victim closest to the layout origin (top-left)
          // Both vertical and horizontal shifts will start displacing layout from this first affected node.
          for (const source of shift.sources) {
            if (!source.node || source.node.nodeType !== 1) continue;
            const el = source.node as Element;
            if (el.tagName === "HTML" || el.tagName === "BODY") continue;

            const prevTop = source.previousRect.top;
            const prevLeft = source.previousRect.left;

            if (
              !firstSource ||
              prevTop < firstSource.prevTop ||
              (prevTop === firstSource.prevTop &&
                prevLeft < firstSource.prevLeft)
            ) {
              firstSource = {
                node: el,
                prevTop,
                prevLeft,
                prevRect: source.previousRect,
                currRect: source.currentRect,
              };
            }
          }

          if (firstSource) {
            const { node, prevRect, currRect } = firstSource;
            let culprit = node;

            // Did the primary element physically expand its own dimensional box?
            const expanded =
              currRect.width > prevRect.width ||
              currRect.height > prevRect.height;

            if (!expanded) {
              // If the element didn't expand, it was pushed.
              // The exact culprit is the element that expanded into the space previously occupied by the victim.
              const dx = currRect.left - prevRect.left;
              const dy = currRect.top - prevRect.top;

              // Exactly halfway into the newly pushed space (vertically and horizontally)
              const probeX = Math.max(0, prevRect.left + (dx > 0 ? dx / 2 : 5));
              const probeY = Math.max(0, prevRect.top + (dy > 0 ? dy / 2 : 5));

              const physicalCulprit = document.elementFromPoint(probeX, probeY);
              if (physicalCulprit && physicalCulprit.nodeType === 1) {
                culprit = physicalCulprit;
              } else if (node.previousElementSibling) {
                // Fallback for offscreen/unhittable edge cases
                culprit = node.previousElementSibling;
              }
            }

            // Always drill down if the raycast landed on a wrapper, ensuring we hit the raw media asset
            const media = culprit.querySelector(
              "img, iframe, video, picture, [data-ad]",
            );
            if (media) culprit = media;

            const exactRect = culprit.getBoundingClientRect();
            bestSource = {
              node: culprit,
              width: exactRect.width || currRect.width,
              height: exactRect.height || currRect.height,
            };
          }

          if (bestSource) {
            const el = bestSource.node as Element;
            const selector = el.id
              ? `#${el.id}`
              : `${el.tagName.toLowerCase()}${el.className ? "." + String(el.className).split(" ").filter(Boolean).join(".") : ""}`;

            shiftMap.set(selector, (shiftMap.get(selector) || 0) + shift.value);
            rectMap.set(selector, {
              width: bestSource.width,
              height: bestSource.height,
            });
          }
        }
      });

      observer.observe({ type: "layout-shift", buffered: true });

      setTimeout(() => {
        observer.disconnect();
        const results: ShiftAttribution[] = Array.from(shiftMap.entries())
          .map(
            ([selector, score]) =>
              ({
                selector,
                score,
                width: Math.round(rectMap.get(selector)!.width),
                height: Math.round(rectMap.get(selector)!.height),
              }) as ShiftAttribution,
          )
          .sort((a, b) => b.score - a.score)
          .slice(0, 8); // Increased limit as AI can handle more context now
        resolve(results);
      }, 1500); // Increased from 600ms for better reliability
    });
  });
};
