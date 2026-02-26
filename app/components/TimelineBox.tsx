import { useDraggable } from "@dnd-kit/core";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";

export type AssetType = "script" | "css" | "font" | "img";
export interface AssetItem {
  id: string;
  name: string;
  volume: number;
  startTime: number;
  duration?: number;
  type: AssetType;
  priority?: string;
  moveTo?: "highest" | "background" | null;
  isSuggested?: boolean;
}

const timelineColors: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  js: {
    bg: "bg-orange-100",
    border: "border-orange-200",
    text: "text-orange-700",
  },
  script: {
    bg: "bg-orange-100",
    border: "border-orange-200",
    text: "text-orange-700",
  },
  css: {
    bg: "bg-sky-100",
    border: "border-sky-300",
    text: "text-sky-950",
  },
  font: {
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-900",
  },
  img: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-900",
  },
};

export function TimelineBox({
  script,
  minTime = 0,
  timeSpan = 500,
  lane = 0,
}: {
  script: AssetItem;
  minTime?: number;
  timeSpan?: number;
  lane?: number;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: script.id,
    data: script,
  });

  const colors = (timelineColors[script.type] || timelineColors.js)!;

  const minHeight = 40;
  const maxHeight = 120; // Lowered to keep things in view
  const volume = script.volume || 1;

  // Nuanced height scaling
  let dynamicHeight = minHeight + Math.pow(volume, 0.4) * 12;
  dynamicHeight = Math.min(dynamicHeight, maxHeight);

  // Z-index: smaller items on top
  const zIndex = Math.max(10, 300 - Math.floor(volume));

  // Tighter vertical offset to avoid clipping
  const verticalOffset = (lane % 6) * 10 - 25;

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={`absolute border-2 rounded-md cursor-grab active:cursor-grabbing shadow-sm transition-all hover:scale-[1.02] hover:z-[500] flex items-center ${colors.bg} ${colors.border}`}
            style={{
              left: `${Math.max(0, Math.min(((script.startTime - minTime) / timeSpan) * 100, 98))}%`,
              // We use a pixel-based minimum width to ensure readability of the label
              // even for very short durations.
              width:
                script.duration && (script.duration / timeSpan) * 100 > 6
                  ? `${(script.duration / timeSpan) * 100}%`
                  : "64px",
              height: `${dynamicHeight}px`,
              top: "50%",
              transform: `translateY(calc(-50% + ${verticalOffset}px))`,
              opacity: isDragging ? 0.6 : 1,
              zIndex: isDragging ? 600 : zIndex,
            }}
          >
            <div
              className={`relative w-full flex flex-col justify-center px-4 py-3 leading-none ${colors.text}`}
            >
              <div
                className="font-semibold truncate text-right w-full"
                title={script.name}
              >
                {script.name}
              </div>
              <div className="text-xs opacity-70 flex justify-between mt-0.5">
                <span className="truncate">
                  {script.type === "script" ? "js" : script.type}
                </span>
                <span className="shrink-0 font-mono">{volume}KB</span>
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="bg-slate-900/95 backdrop-blur-xl text-white border-white/20 p-3 rounded-xl shadow-2xl z-[9999]"
        >
          <div className="font-mono text-[11px] space-y-0.5">
            <div className="font-bold text-blue-400">{script.name}</div>
            <div className="flex gap-3 text-slate-300">
              <span>
                Size: <b className="text-white">{volume} KB</b>
              </span>
              <span>
                Start:{" "}
                <b className="text-white">{Math.round(script.startTime)} ms</b>
              </span>
            </div>
            {script.duration && (
              <div className="text-emerald-400">
                Duration: <b>{Math.round(script.duration)} ms</b>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { timelineColors };
