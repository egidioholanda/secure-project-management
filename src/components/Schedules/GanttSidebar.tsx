import { useMemo, useRef, useState } from 'react';
import type { Task } from '@/types/schedule';
import { cn } from '@/lib/utils';
import { Flag, GripVertical } from 'lucide-react';
import { getTaskStatus, STATUS_COLORS } from '@/utils/ganttUtils';

const ROW_HEIGHT = 48;

interface GanttSidebarProps {
  tasks: Task[];
  milestoneTasks: Task[];
  selectedTaskId: string | null;
  onTaskSelect: (task: Task) => void;
  onReorder?: (orderedIds: string[]) => void;
}

export const GanttSidebar = ({
  tasks,
  milestoneTasks,
  selectedTaskId,
  onTaskSelect,
  onReorder,
}: GanttSidebarProps) => {
  const today = useMemo(() => new Date(), []);
  const listRef = useRef<HTMLDivElement>(null);

  // Refs hold live values accessible inside closures without stale captures
  const draggingIdRef = useRef<string | null>(null);
  const dropIndexRef  = useRef<number | null>(null);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropIndex,  setDropIndex]  = useState<number | null>(null);

  const startDrag = (e: React.MouseEvent, taskId: string) => {
    e.preventDefault();
    e.stopPropagation();

    draggingIdRef.current = taskId;
    dropIndexRef.current  = null;
    setDraggingId(taskId);
    setDropIndex(null);

    const onMove = (me: MouseEvent) => {
      if (!listRef.current) return;
      const rect = listRef.current.getBoundingClientRect();
      const relY  = me.clientY - rect.top;
      // Snap to the nearest gap between rows
      const idx = Math.max(0, Math.min(tasks.length, Math.floor(relY / ROW_HEIGHT + 0.5)));
      dropIndexRef.current = idx;
      setDropIndex(idx);
    };

    const onUp = () => {
      const fromId = draggingIdRef.current;
      const toIdx  = dropIndexRef.current;

      if (fromId !== null && toIdx !== null && onReorder) {
        const fromIdx = tasks.findIndex((t) => t.id === fromId);
        // Skip if no actual movement (dropped on same position or adjacent)
        if (fromIdx !== -1 && fromIdx !== toIdx && fromIdx + 1 !== toIdx) {
          const arr = [...tasks];
          const [moved] = arr.splice(fromIdx, 1);
          // After removing the dragged item, indices after it shift down by 1
          const insertAt = toIdx > fromIdx ? toIdx - 1 : toIdx;
          arr.splice(Math.max(0, Math.min(arr.length, insertAt)), 0, moved);
          onReorder(arr.map((t) => t.id));
        }
      }

      draggingIdRef.current = null;
      dropIndexRef.current  = null;
      setDraggingId(null);
      setDropIndex(null);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  return (
    <div className="w-80 flex-shrink-0 border-r border-border bg-card">
      {/* Header — must match GanttHeader height exactly: 98px */}
      <div className="sticky top-0 z-20 bg-card border-b border-border">
        <div className="h-[98px] flex items-end pb-2 px-4 bg-muted/50 border-b border-border">
          <span className="text-sm font-semibold text-foreground">Tarefas</span>
        </div>
      </div>

      {/* Milestones */}
      {milestoneTasks.length > 0 && (
        <div className="border-b border-border bg-muted/10">
          <div className="px-4 py-1 flex items-center gap-2">
            <Flag className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Marcos</span>
          </div>
          {milestoneTasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                'h-10 flex items-center gap-3 px-4 border-t border-border/50 cursor-pointer hover:bg-muted/50 transition-colors',
                selectedTaskId === task.id && 'bg-primary/5'
              )}
              onClick={() => onTaskSelect(task)}
            >
              <div className="w-3 h-3 rotate-45 flex-shrink-0" style={{ backgroundColor: task.color }} />
              <p className="text-sm font-medium truncate text-foreground">{task.name}</p>
            </div>
          ))}
        </div>
      )}

      {/* Flat task list with drag handles */}
      <div ref={listRef} className="relative select-none">
        {tasks.map((task, idx) => {
          const status         = getTaskStatus(task, today);
          const colors         = STATUS_COLORS[status];
          const isDraggingThis = draggingId === task.id;
          const showBefore     = dropIndex === idx && !!draggingId && !isDraggingThis;
          const showAfter      = dropIndex === tasks.length && idx === tasks.length - 1 && !!draggingId && !isDraggingThis;

          return (
            <div key={task.id} className="relative">
              {/* Drop indicator — above this row */}
              {showBefore && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary z-20 pointer-events-none rounded-full" />
              )}

              <div
                className={cn(
                  'h-12 flex items-center gap-2 px-2 border-b border-border transition-colors',
                  !draggingId && 'hover:bg-muted/50 cursor-pointer',
                  selectedTaskId === task.id && 'bg-primary/5',
                  isDraggingThis && 'opacity-40 bg-muted/30',
                  !!draggingId && !isDraggingThis && 'cursor-ns-resize'
                )}
                onClick={() => !draggingId && onTaskSelect(task)}
              >
                {/* Drag handle */}
                <div
                  className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing flex-shrink-0 p-1 rounded hover:bg-muted"
                  onMouseDown={(e) => startDrag(e, task.id)}
                  onClick={(e) => e.stopPropagation()}
                  title="Arrastar para reordenar"
                >
                  <GripVertical className="w-3.5 h-3.5" />
                </div>

                {/* Project color bar */}
                <div
                  className="w-1 h-6 rounded-full flex-shrink-0"
                  style={{ backgroundColor: task.color }}
                />

                {/* Task info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">{task.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{task.projectName}</p>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <div className="w-10 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{ width: `${task.progress}%`, backgroundColor: colors.progress }}
                    />
                  </div>
                  <span className="text-xs w-8 text-right" style={{ color: colors.text }}>
                    {task.progress}%
                  </span>
                </div>
              </div>

              {/* Drop indicator — below last row */}
              {showAfter && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary z-20 pointer-events-none rounded-full" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
