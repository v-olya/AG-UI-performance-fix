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
  const [timelineAssets, setTimelineAssets] = useState<AssetItem[]>(assets);

  const [assignments, setAssignments] = useState<SlotAssignments>(() => {
    return {
      highest: assets.filter((s) => s.moveTo === "highest").map((s) => s.id),
      background: assets
        .filter((s) => s.moveTo === "background")
        .map((s) => s.id),
    };
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
      setAssignments((prev) => ({
        ...prev,
        [slot]: Array.from(new Set([...prev[slot], scriptId])),
      }));
      // Remove from timeline when assigned to a slot
      setTimelineAssets((prev) => prev.filter((s) => s.id !== scriptId));
      onPriorityChange?.(scriptId, slot);
    }
  };

  // Get asset info for display
  const getAssetInfo = (id: string) => {
    const asset = assets.find((s) => s.id === id);
    if (!asset) return undefined;
    return { name: asset.name, type: asset.type };
  };

  // Get asset info for drag overlay
  const getActiveAssetInfo = () => {
    if (!activeId) return null;
    const asset = assets.find((s) => s.id === activeId);
    return asset;
  };

  return (
    <div className="w-full bg-white/70 rounded-xl shadow-sm border border-border/50 p-6">
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex flex-col gap-6">
          {aiSuggestion && (
            <div className="p-4 text-sm">
              <span className="font-semibold">AI Suggestion:</span>{" "}
              {aiSuggestion}
            </div>
          )}

          <div className="flex gap-4 items-stretch">
            {/* Highest Priority Slot */}
            <PrioritySlot
              id="highest"
              assignedIds={assignments.highest}
              getAssetInfo={getAssetInfo}
            />

            {/* Timeline - Loading Timeline with all assets */}
            <TimelineDropZone>
              <div className="absolute inset-0 flex items-center px-4">
                {/* Timeline axis */}
                <div className="w-full h-0.5 bg-slate-300 relative">
                  {/* Render all timeline boxes with overlapping support */}
                  {timelineAssets.map((asset) => (
                    <TimelineBox key={asset.id} script={asset} />
                  ))}
                </div>
              </div>

              {/* Time markers */}
              <div className="absolute bottom-3 left-4 right-4 flex justify-between text-xs text-slate-400 font-mono">
                <span>0ms</span>
                <span>100ms</span>
                <span>200ms</span>
                <span>300ms</span>
                <span>400ms</span>
                <span>500ms</span>
              </div>
            </TimelineDropZone>

            {/* Background/Lowest Priority Slot */}
            <PrioritySlot
              id="background"
              assignedIds={assignments.background}
              getAssetInfo={getAssetInfo}
            />
          </div>

          <p className="text-sm text-gray-500 text-center">
            Drag assets from the timeline to the priority slots to optimize
            loading order
          </p>
        </div>
        <DragOverlay>
          {activeId
            ? (() => {
                const asset = getActiveAssetInfo();
                if (!asset) return null;
                const colors = timelineColors[asset.type] || timelineColors.js;
                return (
                  <div
                    className={`px-4 py-3 rounded-lg border-2 shadow-xl text-xs font-mono ${colors?.bg} ${colors?.border} ${colors?.text}`}
                  >
                    <div className="font-semibold">{asset.name}</div>
                    <div className="text-[10px] opacity-70">{asset.type}</div>
                  </div>
                );
              })()
            : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
