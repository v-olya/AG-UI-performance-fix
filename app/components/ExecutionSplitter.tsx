import { useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface ExecutionSplitterProps {
  code: string;
  markers: number[]; // positions between logical lines: 0..lines.length
  onYield: (pos: number) => void;
  className?: string;
}

export function ExecutionSplitter({
  code,
  markers,
  onYield,
  className = "",
}: ExecutionSplitterProps) {
  const lines = useMemo(() => code.split("\n"), [code]);

  const markerSet = useMemo(() => {
    const s = new Set<number>(markers);
    return s;
  }, [markers]);

  const lineMinHeight = 24;

  return (
    <div className="w-full max-w-3xl mx-auto text-left">
      <TooltipProvider delayDuration={100}>
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
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          onClick={() => onYield(slot)}
                          aria-label={`Yield before line ${slot + 1}`}
                          className="m-[0px] text-amber-600 bg-transparent text-xl font-bold"
                        >
                          ⤷
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>Yield before line {slot + 1}</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <div className="w-full" />
                  )}
                </div>
              );
            })}
          </div>

          <pre className="p-3 pl-6 overflow-auto text-sm font-mono w-full">
            <code>
              {lines.map((line, i) => (
                <div
                  key={line + i.toString()}
                  className={`min-h-[${lineMinHeight}px] leading-6 whitespace-pre`}
                >
                  {i + 1}. {line === "" ? "\u00a0" : line}
                </div>
              ))}
            </code>
          </pre>
        </div>
      </TooltipProvider>
    </div>
  );
}
