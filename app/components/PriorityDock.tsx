import {
  DndContext,
  DragOverlay,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { ReactNode, useState } from "react";
import { PrioritySlot } from "./PripritySlot";
import { TimelineBox, AssetItem, timelineColors } from "./TimelineBox";

interface SlotAssignments {
  highest: string[];
  background: string[];
}

interface PriorityDockProps {
  assets: AssetItem[];
  aiSuggestion?: string;
  onPriorityChange?: (assetId: string, slot: "highest" | "background") => void;
}

function TimelineDropZone({ children }: { children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: "timeline" });
  return (
    <div
      ref={setNodeRef}
      className={`relative flex-1 h-56 bg-slate-50 border rounded-xl overflow-hidden transition-colors ${
        isOver ? "border-green-500 bg-green-50/50" : "border-slate-200"
      }`}
    >
      {children}
    </div>
  );
}

export function PriorityDock({
  assets,
  aiSuggestion,
  onPriorityChange,
}: PriorityDockProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const [assignments, setAssignments] = useState<SlotAssignments>(() => {
    return {
      highest: assets
        .filter((s) =>
          ["preload", 'fetchpriority="high"'].includes(s.priority || ""),
        )
        .map((s) => s.id),
      background: assets
        .filter((s) =>
          ["defer", "async", "prefetch"].includes(s.priority || ""),
        )
        .map((s) => s.id),
    };
  });

  const [timelineAssets, setTimelineAssets] = useState<AssetItem[]>(() => {
    const assignedIds = new Set([
      ...assets
        .filter((s) =>
          ["preload", 'fetchpriority="high"'].includes(s.priority || ""),
        )
        .map((s) => s.id),
      ...assets
        .filter((s) =>
          ["defer", "async", "prefetch"].includes(s.priority || ""),
        )
        .map((s) => s.id),
    ]);
    return assets.filter((s) => !assignedIds.has(s.id));
  });

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { over, active } = event;
    setActiveId(null);

    const scriptId = active.id as string;

    if (over?.id === "timeline") {
      // Dragging back to timeline - remove from any slot
      setAssignments((prev) => ({
        highest: prev.highest.filter((id) => id !== scriptId),
        background: prev.background.filter((id) => id !== scriptId),
      }));
      // Add back to timeline preserving original order
      setTimelineAssets((prev) => {
        if (prev.some((s) => s.id === scriptId)) return prev;
        const asset = assets.find((s) => s.id === scriptId);
        if (!asset) return prev;
        // Insert at original position from assets array
        const originalIndex = assets.findIndex((s) => s.id === scriptId);
        const newAssets = [...prev];
        newAssets.splice(originalIndex, 0, asset);
        return newAssets;
      });
    } else if (over && (over.id === "highest" || over.id === "background")) {
      const slot = over.id as keyof SlotAssignments;
      setAssignments((prev) => {
        const otherSlot = slot === "highest" ? "background" : "highest";
        return {
          ...prev,
          [otherSlot]: prev[otherSlot].filter((id) => id !== scriptId),
          [slot]: Array.from(new Set([...prev[slot], scriptId])),
        };
      });
      setTimelineAssets((prev) => prev.filter((s) => s.id !== scriptId));
      onPriorityChange?.(scriptId, slot);
    }
  };

  const getAssetInfo = (id: string) => {
    const asset = assets.find((s) => s.id === id);
    if (!asset) return undefined;
    return { name: asset.name, type: asset.type };
  };

  const getActiveAssetInfo = () => {
    if (!activeId) return null;
    return assets.find((s) => s.id === activeId);
  };

  const maxTime = Math.max(
    500,
    ...assets.map((a) => a.startTime + (a.duration || 0) + 50),
  );

  const minTime =
    assets.length > 0 ? Math.min(...assets.map((a) => a.startTime)) : 0;
  const timeSpan = Math.max(500, maxTime - minTime);

  const timelineSteps = Array.from({ length: 6 }).map((_, i) =>
    Math.round(minTime + (timeSpan / 5) * i),
  );

  return (
    <div className="w-full bg-white rounded-lg shadow-sm border p-6 text-left">
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex flex-col gap-8">
          {aiSuggestion && (
            <div className="p-4 text-sm">
              <span className="font-semibold">AI Suggestion:</span>{" "}
              {aiSuggestion}
            </div>
          )}

          <div className="flex gap-6 items-stretch min-h-[300px]">
            <PrioritySlot
              id="highest"
              assignedIds={assignments.highest}
              getAssetInfo={getAssetInfo}
            />

            <TimelineDropZone>
              <div className="absolute inset-0 flex items-center px-6">
                <div className="w-full h-px bg-slate-200/50 relative">
                  {(() => {
                    const sorted = [...timelineAssets].sort(
                      (a, b) => b.volume - a.volume,
                    );
                    const lanes: number[] = []; // Stores the 'end time' of the last item in each lane

                    return sorted.map((asset) => {
                      const start = asset.startTime;
                      const end = start + (asset.duration || 5); // Use a small buffer if duration is 0

                      let laneIndex = lanes.findIndex(
                        (laneEnd) => start >= laneEnd,
                      );
                      if (laneIndex === -1) {
                        laneIndex = lanes.length;
                        lanes.push(end);
                      } else {
                        lanes[laneIndex] = end;
                      }

                      return (
                        <TimelineBox
                          key={asset.id}
                          script={asset}
                          minTime={minTime}
                          timeSpan={timeSpan}
                          lane={laneIndex}
                        />
                      );
                    });
                  })()}
                </div>
              </div>

              <div className="absolute bottom-4 left-6 right-6 flex justify-between text-[10px] text-slate-400 font-mono font-bold uppercase tracking-tighter">
                {timelineSteps.map((step) => (
                  <span key={step}>{step}ms</span>
                ))}
              </div>
            </TimelineDropZone>

            <PrioritySlot
              id="background"
              assignedIds={assignments.background}
              getAssetInfo={getAssetInfo}
            />
          </div>

          <p className="text-xs text-muted-foreground font-medium text-center">
            Drag assets from the loading timeline into the priority slots as
            suggested by the AI audit.
          </p>
        </div>
        <DragOverlay>
          {activeId
            ? (() => {
                const asset = getActiveAssetInfo();
                if (!asset) return null;
                const colors = (timelineColors[asset.type] ||
                  timelineColors.js)!;

                return (
                  <div
                    className={`px-4 py-3 rounded-lg border-2 shadow-xl text-xs font-mono ${colors.bg} ${colors.border} ${colors.text}`}
                  >
                    <div className="font-semibold">{asset.name}</div>
                    <div className="text-[10px] opacity-70 font-mono font-bold flex gap-2">
                      <span className="bg-black/10 px-1 rounded">
                        {asset.type}
                      </span>
                      <span>{asset.volume} KB</span>
                    </div>
                  </div>
                );
              })()
            : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
