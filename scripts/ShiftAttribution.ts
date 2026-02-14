import { Page } from 'playwright';
import type { ShiftAttribution } from './types/index.js';

export const extractLayoutShiftAttribution = async (page: Page): Promise<ShiftAttribution[]> => {
  return await page.evaluate(() => {
    return new Promise((resolve) => {
      // See scripts/types/performance.ts for type definitions
      type LayoutShift = PerformanceEntry & {
        hadRecentInput: boolean;
        sources: Array<{ node: Element; previousRect: DOMRectReadOnly; currentRect: DOMRectReadOnly }>;
        value: number;
      };

      const shifts: ShiftAttribution[] = [];

      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        for (const entry of entries) {
          // Type guard: check for layout shift properties
          if (
            entry &&
            "hadRecentInput" in entry &&
            !entry.hadRecentInput &&
            "sources" in entry &&
            "value" in entry
          ) {
            const layoutShiftEntry = entry as LayoutShift;
            const sources = layoutShiftEntry.sources;
            if (!sources) continue;
            for (const source of sources) {
              if (!source) continue;
              const el = source.node;
              const selector = el 
                ? (el.id ? `#${el.id}` : `${el.tagName.toLowerCase()}${el.className ? '.' + el.className.split(' ').join('.') : ''}`)
                : 'unknown-element';

              shifts.push({
                selector,
                score: layoutShiftEntry.value,
                prevRect: source.previousRect,
                currRect: source.currentRect
              });
            }
          }
        }
      });

      observer.observe({ type: 'layout-shift', buffered: true });

      setTimeout(() => {
        observer.disconnect();
        resolve(shifts.sort((a, b) => b.score - a.score).slice(0, 5));
      }, 500);
    });
  });
};
