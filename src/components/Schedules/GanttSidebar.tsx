import { useRef, useState } from 'react';
import type { Task } from '@/types/schedule';
import { cn } from '@/lib/utils';
import { Flag, GripVertical, ChevronRight } from 'lucide-react';
import { getTaskStatus, STATUS_COLORS } from '@/utils/ganttUtils';
import type { DisplayRow, ProjectGroup } from './ganttTypes';

const ROW_HEIGHT = 48;

interface GanttSidebarProps {
  displayRows: DisplayRow[];
  expandedProjects: Set<string>;
  onToggleProject: (projectId: string) => void;
  milestoneTasks: Task[];
  selectedTaskId: string | null;
  onTaskSelect: (task: Task) => void;
  onReorder?: (orderedIds: string[]) => void;
  scrollRef?: React.RefObject<HTMLDivElement>;
  containerRef?: React.RefObject<HTMLDivElement>;
}

export const GanttSidebar = ({
  displayRows,
  expandedProjects,
  onToggleProject,
  milestoneTasks,
  selectedTaskId,
  onTaskSelect,
  onReorder,
  scrollRef,
  containerRef,
}: GanttSidebarProps) => {
  const today = new Date();
  const listRef = useRef<HTMLDivElement>(null);

  const draggingIdRef = useRef<string | null>(null);
  const dropIndexRef  = useRef<number | null>(null);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropIndex,  setDropIndex]  = useState<number | null>(null);

  // Only task rows participate in drag-and-drop
  const taskRows = displayRows.filter((r): r is { type: 'task'; task: Task } => r.type === 'task');

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
      const idx = Math.max(0, Math.min(taskRows.length, Math.floor(relY / ROW_HEIGHT + 0.5)));
      dropIndexRef.current = idx;
      setDropIndex(idx);
    };

    const onUp = () => {
      const fromId = draggingIdRef.current;
      const toIdx  = dropIndexRef.current;

      if (fromId !== null && toIdx !== null && onReorder) {
        const fromIdx = taskRows.findIndex((r) => r.task.id === fromId);
        if (fromIdx !== -1 && fromIdx !== toIdx && fromIdx + 1 !== toIdx) {
          const arr = [...taskRows];
          const [moved] = arr.splice(fromIdx, 1);
          const insertAt = toIdx > fromIdx ? toIdx - 1 : toIdx;
          arr.splice(Math.max(0, Math.min(arr.length, insertAt)), 0, moved);
          onReorder(arr.map((r) => r.task.id));
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
    <div ref={containerRef} className="w-80 flex-shrink-0 border-r border-border bg-card flex flex-col">
      {/* Header — fixo no topo da coluna flex, sem necessidade de sticky */}
      <div className="flex-shrink-0 bg-card border-b border-border">
        <div className="border-b border-border px-4 py-1.5 bg-muted/50">
          <span className="text-sm font-semibold text-foreground">Projetos / Tarefas</span>
        </div>
        <div className="border-b border-border px-4 py-1">
          <div className="text-xs invisible select-none" aria-hidden="true">·</div>
          <div className="text-xs invisible select-none" aria-hidden="true">·</div>
        </div>
        <div className="h-8 bg-muted/20 border-b border-border" />
      </div>

      {/* Conteúdo — overflow hidden, scrollTop controlado via JS sincronizado com chartRef */}
      <div ref={scrollRef} className="flex-1 overflow-hidden">
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

        {/* Display rows */}
        <div ref={listRef} className="relative select-none">
        {displayRows.map((row) => {
          if (row.type === 'project') {
            const { group } = row;
            const isExpanded = expandedProjects.has(group.projectId);
            return (
              <ProjectHeaderRow
                key={`project-${group.projectId}`}
                group={group}
                isExpanded={isExpanded}
                onToggle={() => onToggleProject(group.projectId)}
              />
            );
          }

          // Task row
          const { task } = row;
          const taskIdx   = taskRows.findIndex((r) => r.task.id === task.id);
          const status         = getTaskStatus(task, today);
          const colors         = STATUS_COLORS[status];
          const isDraggingThis = draggingId === task.id;
          const showBefore     = dropIndex === taskIdx && !!draggingId && !isDraggingThis;
          const showAfter      = dropIndex === taskRows.length && taskIdx === taskRows.length - 1 && !!draggingId && !isDraggingThis;

          return (
            <div key={task.id} className="relative">
              {showBefore && (
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary z-20 pointer-events-none rounded-full" />
              )}

              <div
                className={cn(
                  'h-12 flex items-center gap-2 px-2 pl-6 border-b border-border transition-colors',
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

              {showAfter && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary z-20 pointer-events-none rounded-full" />
              )}
            </div>
          );
        })}
        </div>
      </div>
    </div>
  );
};

// ─── Project header row ────────────────────────────────────────────────────────

function ProjectHeaderRow({
  group,
  isExpanded,
  onToggle,
}: {
  group: ProjectGroup;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="h-12 flex items-center gap-2 px-3 border-b border-border bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors group"
      onClick={onToggle}
    >
      {/* Chevron */}
      <ChevronRight
        className={cn(
          'w-4 h-4 flex-shrink-0 text-muted-foreground transition-transform duration-200',
          isExpanded && 'rotate-90'
        )}
      />

      {/* Color dot — status-based color */}
      <div
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: group.statusColor }}
      />

      {/* Project name + task count + equipe */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold truncate text-foreground">{group.projectName}</p>
        <p className="text-xs text-muted-foreground truncate">
          {group.tasks.length} tarefa{group.tasks.length !== 1 ? 's' : ''}
          {group.teamName && <> · {group.teamName}</>}
        </p>
      </div>

      {/* Average progress bar — status-based color */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <div className="w-14 h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${group.avgProgress}%`, backgroundColor: group.statusColor }}
          />
        </div>
        <span className="text-xs w-8 text-right font-medium" style={{ color: group.statusColor }}>
          {group.avgProgress}%
        </span>
      </div>
    </div>
  );
}
