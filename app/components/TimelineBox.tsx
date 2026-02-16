import { useDraggable } from "@dnd-kit/core";

export interface AssetItem {
  id: string;
  name: string;
  volume: number; // Represents "width" or weight
  startTime: number; // Represents "x" position
  type: "js" | "css" | "font";
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
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={" "}
      style={{
        left: script.startTime,
        width: script.volume,
        opacity: isDragging ? 0.3 : 1, // Visual cue: dimmed while dragging
      }}
    >
      {script.name}
    </div>
  );
}
