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
  moveTo?: "highest" | "background" | null;
}

const timelineColors: Record<
  string,
  { bg: string; border: string; text: string; height: number }
> = {
  js: {
    bg: "bg-orange-100",
    border: "text-orange-600",
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

  const minHeight = 30;
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
            className={`absolute ${colors?.bg} ${colors?.border} border-2 rounded-md cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-all hover:scale-105 hover:z-30`}
            style={{
              left: `${script.startTime}px`,
              width: `${Math.max(script.volume, 70)}px`,
              height: `${dynamicHeight}px`,
              top: "50%",
              transform: `translateY(-50%)`,
              opacity: isDragging ? 0.6 : 1,
              zIndex: isDragging ? 100 : 20,
            }}
          >
            <div
              className={`h-full flex flex-col justify-center px-2 ${colors?.text}`}
            >
              <div className="font-semibold truncate">{script.name}</div>
              <div className="text-xs opacity-70 flex justify-between">
                <span>{script.type}</span>
                <span>{script.volume}KB</span>
              </div>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p>
            {script.name} ({script.volume}KB)
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export { timelineColors };
