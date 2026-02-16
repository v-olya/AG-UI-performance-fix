import React from "react";
import { Button } from "./ui/button";

export interface CodeYieldProps {
  code: string;
  markers: number[]; // positions between logical lines: 0..lines.length
  onYield: (pos: number) => void;
  className?: string;
}

export function CodeYield({
  code,
  markers,
  onYield,
  className = "",
}: CodeYieldProps) {
  const lines = React.useMemo(() => code.split("\n"), [code]);

  const markerSet = React.useMemo(() => {
    const s = new Set<number>(markers);
    return s;
  }, [markers]);

  // Visual sizing constants (keep simple)
  const lineMinHeight = 24;

  return (
    <div
      className={`flex rounded-md border border-slate-200 bg-white overflow-hidden ${className}`}
    >
      <div className="w-14 bg-slate-50 border-r border-slate-100 py-2 flex flex-col items-center select-none">
        {Array.from({ length: lines.length + 1 }, (_, slot) => {
          const show = markerSet.has(slot);
          return (
            <div
              key={`slot-${slot}`}
              className="w-full flex items-center justify-center"
              style={{ minHeight: lineMinHeight }}
            >
              {show ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onYield(slot)}
                  aria-label={`Yield at ${slot}`}
                  title={`Yield at ${slot}`}
                  className="text-sky-600 hover:bg-sky-50"
                >
                  ⤷
                </Button>
              ) : (
                <div className="w-full" />
              )}
            </div>
          );
        })}
      </div>

      <pre className="p-3 overflow-auto text-sm font-mono w-full">
        <code>
          {lines.map((line) => (
            <div key={line} className="min-h-[24px] leading-6 whitespace-pre">
              {line === "" ? "\u00a0" : line}
            </div>
          ))}
        </code>
      </pre>
    </div>
  );
}
