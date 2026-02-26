import { useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

interface ExecutionSplitterProps {
  code: string;
  markers: number[];
  strategies?: Array<{ position: number; strategy: string; reason: string }>;
  onYield: (pos: number, strategy?: string) => void;
  className?: string;
  scriptUrl?: string;
}

export function ExecutionSplitter({
  code,
  markers,
  strategies = [],
  onYield,
  className = "",
  scriptUrl = "blocking_logic.js",
}: ExecutionSplitterProps) {
  const lines = useMemo(() => {
    if (!code) return [];
    // Handle literal \n or escaped newlines from AI source
    const normalized = code.replace(/\\n/g, "\n");
    return normalized.split("\n");
  }, [code]);
  const markerSet = useMemo(() => new Set<number>(markers), [markers]);

  return (
    <div
      className={`w-full border rounded-xl bg-[#0d1117] overflow-hidden shadow-2xl ${className}`}
    >
      <TooltipProvider delayDuration={100}>
        <div className="flex flex-col max-h-[600px]">
          <div className="px-4 py-2 border-b border-white/5 bg-white/5 flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
              <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
              <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
            </div>
            <span className="text-[11px] font-mono text-slate-500 select-none uppercase tracking-widest">
              {scriptUrl}
            </span>
          </div>

          <div className="overflow-auto scrollbar-thin scrollbar-thumb-white/10">
            <div className="flex min-w-full w-fit bg-[#0d1117]">
              <div className="select-none flex flex-col shrink-0 bg-[#0d1117] border-r border-white/5 min-w-[3.5rem]">
                {lines.map((_, i) => (
                  <div key={`line-meta-${i}`} className="flex flex-col">
                    <div className="h-[26px] relative flex items-center justify-center">
                      <div className="absolute inset-y-0 right-0 w-[2px] bg-white/5" />
                      <span className="text-[11px] font-mono text-slate-600 w-full text-right pr-4">
                        {i + 1}
                      </span>
                      {markerSet.has(i) &&
                        (() => {
                          const strat = strategies.find(
                            (s) => s.position === i,
                          );
                          return (
                            <div className="absolute left-1 z-10">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => onYield(i, strat?.strategy)}
                                    className="w-6 h-6 flex items-center justify-center rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500 hover:text-white transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                                    aria-label={`Yield before line ${i + 1}`}
                                  >
                                    <span className="text-sm font-bold">⤷</span>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="right"
                                  className="bg-[#161b22] border-white/10 text-white max-w-xs"
                                >
                                  <p className="font-bold text-amber-500 mb-1">
                                    {strat?.strategy || "Yield"}
                                  </p>
                                  <p className="text-xs opacity-80">
                                    {strat?.reason ||
                                      `Yield before line ${i + 1}`}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          );
                        })()}
                    </div>
                  </div>
                ))}

                {markerSet.has(lines.length) &&
                  (() => {
                    const strat = strategies.find(
                      (s) => s.position === lines.length,
                    );
                    return (
                      <div className="h-[26px] relative flex items-center justify-center">
                        <div className="absolute left-1 z-10">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                onClick={() =>
                                  onYield(lines.length, strat?.strategy)
                                }
                                className="w-6 h-6 flex items-center justify-center rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500 hover:text-white transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                                aria-label={`Yield after line ${lines.length}`}
                              >
                                <span className="text-sm font-bold">⤷</span>
                              </button>
                            </TooltipTrigger>
                            <TooltipContent
                              side="right"
                              className="bg-[#161b22] border-white/10 text-white max-w-xs"
                            >
                              <p className="font-bold text-amber-500 mb-1">
                                {strat?.strategy || "Yield"}
                              </p>
                              <p className="text-xs opacity-80">
                                {strat?.reason ||
                                  `Yield after line ${lines.length}`}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    );
                  })()}
              </div>

              <div className="flex flex-col flex-1 bg-[#0d1117]">
                {lines.map((line, i) => (
                  <div
                    key={`line-content-${i}`}
                    className="h-[26px] flex items-center px-4 font-mono text-sm group hover:bg-white/[0.02] transition-colors overflow-visible"
                  >
                    <code className="text-[#e6edf3] whitespace-pre inline-block min-h-[1em]">
                      {line === "" ? "\u00a0" : line}
                    </code>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </TooltipProvider>
    </div>
  );
}
