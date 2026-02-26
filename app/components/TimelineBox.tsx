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
  volume: number; // Represents duration/width
  startTime: number; // Represents start position
  type: AssetType;
  priority?: string; // Initial priority from the audit
  moveTo?: "highest" | "background" | null;
  isSuggested?: boolean;
}

const timelineColors: Record<
  string,
  { bg: string; border: string; text: string; height: number }
> = {
  js: {
    bg: "bg-orange-100",
    border: "border-orange-200",
    text: "text-orange-700",
    height: 48,
  },
  css: {
    bg: "bg-sky-50",
    border: "border-sky-200",
    text: "text-sky-900",
    height: 44,
  },
  font: {
    bg: "bg-violet-50",
    border: "border-violet-200",
    text: "text-violet-900",
    height: 36,
  },
  img: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    text: "text-emerald-900",
    height: 56,
  },
};

export function TimelineBox({ script }: { script: AssetItem }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: script.id,
    data: script,
  });

  const colors = timelineColors[script.type] || timelineColors.js;

  const minHeight = 36;
  const maxHeight = 160;
  const normalizedVolume = script.volume / 500;
  const exponentialFactor = Math.pow(normalizedVolume, 0.4);
  const dynamicHeight = Math.max(
    minHeight,
    Math.min(
      maxHeight,
      minHeight + exponentialFactor * (maxHeight - minHeight),
    ),
  );

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={`absolute border-2 rounded-xl cursor-grab active:cursor-grabbing shadow-sm transition-all hover:scale-110 hover:z-50 ${colors?.bg} ${colors?.border}`}
            style={{
              left: `${script.startTime}px`,
              width: `${Math.max(script.volume, 80)}px`,
              height: `${dynamicHeight}px`,
              top: "50%",
              transform: `translateY(-50%)`,
              opacity: isDragging ? 0.6 : 1,
              zIndex: isDragging ? 200 : 20,
            }}
          >
            <div
              className={`h-full flex flex-col justify-center px-3 ${colors?.text}`}
            >
              <div className="font-semibold truncate text-sm">
                {script.name}
              </div>
              <div className="text-xs opacity-70 flex justify-between">
                <span>{script.type}</span>
                <span>{script.volume}KB</span>
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="bg-slate-900 text-white border-white/10"
        >
          <p className="font-mono text-xs">
            {script.name} • {script.volume}KB • {script.startTime}ms
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { timelineColors };
