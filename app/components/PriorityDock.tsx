import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useState } from "react";
import { PrioritySlot } from "./PripritySlot";
import { AssetItem, TimelineBox } from "./TimeLine";
// import { CSS } from "@dnd-kit/utilities";

export interface SlotAssignments {
  highest: string[];
  background: string[];
}
// AI may return a scheme like this:
// [{ id: 'main.js', verdict: 'preload' }, { id: 'analytics.js', verdict: 'prefetch' }]

export function PriorityDock({ scripts }: { scripts: AssetItem[] }) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const [assignments, setAssignments] = useState<SlotAssignments>(() => {
    return {
      highest: scripts.filter((s) => s.moveTo === "highest").map((s) => s.id),
      background: scripts
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

    if (over && (over.id === "highest" || over.id === "background")) {
      const slot = over.id as keyof SlotAssignments;
      setAssignments((prev) => ({
        ...prev,
        // Add ID to slot, ensuring no duplicates
        [slot]: Array.from(new Set([...prev[slot], active.id as string])),
      }));
    }
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-8 p-10">
        <PrioritySlot id="highest" assignedIds={assignments.highest} />

        <div className="relative h-64 w-full bg-slate-50 border">
          {/* Loop through your scripts scheme here */}
          <TimelineBox
            script={{
              id: "main-js",
              name: "main.js",
              startTime: 10,
              volume: 100,
              type: "js",
            }}
          />
        </div>

        <PrioritySlot id="background" assignedIds={assignments.background} />
      </div>
      <DragOverlay>
        {activeId ? (
          <div className="px-3 py-1 bg-white border shadow-xl rounded text-xs font-mono">
            Dragging: {activeId}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
