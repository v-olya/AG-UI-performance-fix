import { useDroppable } from "@dnd-kit/core";

export function PrioritySlot({
  id,
  assignedIds,
}: {
  id: string;
  assignedIds: string[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`p-4 border-2 rounded ${isOver ? "border-blue-500 bg-blue-50" : "border-dashed"}`}
    >
      <h3 className="text-sm font-bold uppercase mb-2">{id} Priority</h3>
      {assignedIds.map((scriptId) => (
        <div key={scriptId} className={" "}>
          {scriptId}
        </div>
      ))}
    </div>
  );
}
