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
      className={`relative flex-1 h-64 border-2 border-dashed rounded-2xl overflow-hidden transition-all duration-300 ${
        isOver
          ? "border-slate-400 bg-slate-100"
          : "border-slate-200 bg-slate-50"
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
        .filter(
          (s) =>
            (s.moveTo === "highest" || s.priority === "VeryHigh") &&
            !s.isSuggested,
        )
        .map((s) => s.id),
      background: assets
        .filter(
          (s) =>
            (s.moveTo === "background" || s.priority === "Low") &&
            !s.isSuggested,
        )
        .map((s) => s.id),
    };
  });

  const [timelineAssets, setTimelineAssets] = useState<AssetItem[]>(() => {
    const assignedIds = new Set([
      ...assets
        .filter(
          (s) =>
            (s.moveTo === "highest" || s.priority === "VeryHigh") &&
            !s.isSuggested,
        )
        .map((s) => s.id),
      ...assets
        .filter(
          (s) =>
            (s.moveTo === "background" || s.priority === "Low") &&
            !s.isSuggested,
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

  return (
    <div className="w-full bg-white rounded-2xl shadow-xl border border-border p-8 text-left">
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex flex-col gap-8">
          {aiSuggestion && (
            <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 flex gap-4 items-start">
              <div className="mt-1 w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center shrink-0">
                <span className="text-slate-600 font-bold text-sm">i</span>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-slate-900 text-xs uppercase tracking-widest">
                  Performance Insights
                </span>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {aiSuggestion}
                </p>
              </div>
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
                <div className="w-full h-0.5 bg-slate-200 relative">
                  {timelineAssets.map((asset) => (
                    <TimelineBox key={asset.id} script={asset} />
                  ))}
                </div>
              </div>

              <div className="absolute bottom-4 left-6 right-6 flex justify-between text-[10px] text-slate-400 font-mono font-bold uppercase tracking-tighter">
                <span>0ms</span>
                <span>100ms</span>
                <span>200ms</span>
                <span>300ms</span>
                <span>400ms</span>
                <span>500ms</span>
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
                const colors = timelineColors[asset.type] || timelineColors.js;
                return (
                  <div
                    className={`px-4 py-3 rounded-xl border-2 shadow-2xl text-[11px] font-bold uppercase tracking-tight ${colors?.bg} ${colors?.border} ${colors?.text}`}
                  >
                    <div>{asset.name}</div>
                    <div className="text-[9px] opacity-60 font-mono">
                      {asset.type} • {asset.volume}KB
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
