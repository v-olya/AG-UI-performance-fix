import { useDroppable, useDraggable } from "@dnd-kit/core";
import { timelineColors } from "./TimelineBox";

interface PrioritySlotProps {
  id: string;
  assignedIds: string[];
  getAssetInfo: (id: string) => { name: string; type: string } | undefined;
}

function DraggableItem({
  scriptId,
  script,
}: {
  scriptId: string;
  script: { name: string; type: string };
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: scriptId,
  });

  const colors = timelineColors[script.type] || timelineColors.js;

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      title={`${script.name} (${script.type})`}
      className={`px-3 py-2 rounded-lg text-sm cursor-grab active:cursor-grabbing ${colors?.bg} ${colors?.border} border ${colors?.text} shadow-sm`}
    >
      <div className="font-semibold truncate">{script.name}</div>
    </div>
  );
}

export function PrioritySlot({
  id,
  assignedIds,
  getAssetInfo,
}: PrioritySlotProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  const isHighest = id === "highest";
  const label = isHighest ? "Highest Priority" : "Background Priority";

  const containerColors = isOver
    ? isHighest
      ? "border-amber-400 bg-amber-50/60"
      : "border-slate-400 bg-slate-50/60"
    : isHighest
      ? "border-amber-200 bg-amber-50/30"
      : "border-slate-200 bg-slate-50/30";

  return (
    <div
      ref={setNodeRef}
      className={`w-44 min-h-[200px] max-h-[320px] border-2 border-dashed rounded-xl p-4 ${containerColors} transition-all flex flex-col`}
    >
      <h3
        className={`text-xs font-semibold uppercase mb-4 tracking-wide ${
          isHighest ? "text-amber-700" : "text-slate-500"
        }`}
      >
        {label}
      </h3>
      <div className="space-y-2 overflow-y-auto flex-1">
        {assignedIds.length === 0 ? (
          <div className="text-xs text-gray-400 italic text-center py-8">
            Drop items here
          </div>
        ) : (
          assignedIds.map((scriptId) => {
            const script = getAssetInfo(scriptId);
            if (!script) return null;
            return (
              <DraggableItem
                key={scriptId}
                scriptId={scriptId}
                script={script}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
