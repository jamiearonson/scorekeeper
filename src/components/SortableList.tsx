import type { ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";

interface SortableListProps {
  /** Stable item ids, in current order. */
  ids: string[];
  /** Called with the new id order after a drag. */
  onReorder: (ids: string[]) => void;
  children: ReactNode;
}

// Touch-friendly vertical drag-and-drop list. Wrap rows rendered with <SortableRow>.
export function SortableList({ ids, onReorder, children }: SortableListProps) {
  const sensors = useSensors(
    // Mouse/stylus: start after a small move so taps still work.
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    // Touch: long-press to grab, so the page can still scroll on a normal swipe.
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    onReorder(arrayMove(ids, from, to));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>
    </DndContext>
  );
}

interface SortableRowProps {
  id: string;
  className?: string;
  /** Receives drag-handle props to spread onto the grip element. */
  children: (args: {
    handle: Record<string, unknown>;
    isDragging: boolean;
  }) => ReactNode;
}

export function SortableRow({ id, className, children }: SortableRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        isDragging && "relative z-10 opacity-80 shadow-lg",
        className,
      )}
    >
      {children({ handle: { ...attributes, ...listeners }, isDragging })}
    </div>
  );
}
