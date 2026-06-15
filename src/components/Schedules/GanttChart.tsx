import { useMemo, useRef, useEffect, useState } from 'react';
import type { Task } from '@/types/schedule';
import { GanttHeader } from './GanttHeader';
import { GanttRow } from './GanttRow';
import { GanttSidebar } from './GanttSidebar';
import { DependencyArrows } from './DependencyArrows';
import { useGanttDrag } from '@/hooks/useGanttDrag';
import { getCriticalPath } from '@/utils/ganttUtils';
import { eachDayOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';

const DAY_WIDTH = 40;
const ROW_HEIGHT = 48;

interface LinkingState {
  sourceId: string;
  mouseX: number;
  mouseY: number;
}

interface GanttChartProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
  onUpdateMultiple: (tasks: Task[]) => void;
  onAddDependency: (sourceId: string, targetId: string) => void;
  onRemoveDependency: (taskId: string, depId: string) => void;
  onTaskClick: (task: Task) => void;
  startDate: Date;
  endDate: Date;
}

export const GanttChart = ({
  tasks,
  onUpdateTask,
  onUpdateMultiple,
  onAddDependency,
  onRemoveDependency,
  onTaskClick,
  startDate,
  endDate,
}: GanttChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [linkingState, setLinkingState] = useState<LinkingState | null>(null);

  const { dragState, previewTask, handleDragStart, handleDragMove, handleDragEnd, isDragging } =
    useGanttDrag(tasks, onUpdateTask, onUpdateMultiple, DAY_WIDTH);

  const milestoneTasks = useMemo(() => tasks.filter((t) => t.isMilestone), [tasks]);
  const regularTasks = useMemo(() => tasks.filter((t) => !t.isMilestone), [tasks]);
  const criticalPathIds = useMemo(() => getCriticalPath(tasks), [tasks]);
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const totalChartWidth = days.length * DAY_WIDTH;
  const totalChartHeight = regularTasks.length * ROW_HEIGHT;

  // ─── Drag event listeners ──────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (isDragging) handleDragMove(e as unknown as React.MouseEvent); };
    const onUp = () => { if (isDragging) handleDragEnd(); };
    if (isDragging) {
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // ─── Link (dependency) event listeners ────────────────────────────────────
  useEffect(() => {
    if (!linkingState) return;

    const onMove = (e: MouseEvent) => {
      setLinkingState((prev) => prev ? { ...prev, mouseX: e.clientX, mouseY: e.clientY } : null);
    };

    const onUp = (e: MouseEvent) => {
      // Detect if mouse released over a task bar
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const barEl = el?.closest('[data-task-id]');
      const targetId = barEl?.getAttribute('data-task-id');
      if (targetId && targetId !== linkingState.sourceId) {
        onAddDependency(linkingState.sourceId, targetId);
      }
      setLinkingState(null);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [linkingState, onAddDependency]);

  // Scroll to today on mount
  useEffect(() => {
    if (chartRef.current) {
      const daysFromStart = Math.floor(
        (new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      chartRef.current.scrollLeft = Math.max(0, daysFromStart * DAY_WIDTH - 200);
    }
  }, [startDate]);

  const todayOffset = Math.floor(
    (new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Ghost line source position (viewport coords)
  const ghostSourcePos = useMemo(() => {
    if (!linkingState) return null;
    const el = document.getElementById(`gantt-bar-${linkingState.sourceId}`);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: rect.right, y: (rect.top + rect.bottom) / 2 };
  }, [linkingState]);

  const handleLinkStart = (e: React.MouseEvent, sourceId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setLinkingState({ sourceId, mouseX: e.clientX, mouseY: e.clientY });
  };

  return (
    <>
      <div
        className={cn(
          'flex h-full bg-card rounded-lg border border-border overflow-hidden',
          (isDragging || linkingState) && 'select-none',
          linkingState && 'cursor-crosshair'
        )}
      >
        {/* Sidebar */}
        <GanttSidebar
          tasks={regularTasks}
          milestoneTasks={milestoneTasks}
          selectedTaskId={dragState.taskId}
          onTaskSelect={onTaskClick}
        />

        {/* Chart area */}
        <div ref={chartRef} className="flex-1 overflow-auto relative">
          <GanttHeader
            startDate={startDate}
            endDate={endDate}
            dayWidth={DAY_WIDTH}
            viewMode="day"
            milestoneTasks={milestoneTasks}
          />

          {/* Task rows + SVG overlay */}
          <div className="relative" style={{ minWidth: totalChartWidth }}>
            {/* Today line */}
            {todayOffset >= 0 && todayOffset <= days.length && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-destructive z-30 pointer-events-none"
                style={{ left: todayOffset * DAY_WIDTH + DAY_WIDTH / 2 }}
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-destructive rounded-full" />
              </div>
            )}

            {/* Dependency arrows SVG — rendered below task bars */}
            <DependencyArrows
              tasks={regularTasks}
              startDate={startDate}
              dayWidth={DAY_WIDTH}
              totalWidth={totalChartWidth}
              totalHeight={totalChartHeight}
              onRemoveDependency={onRemoveDependency}
            />

            {regularTasks.map((task) => (
              <GanttRow
                key={task.id}
                task={task}
                previewTask={previewTask?.id === task.id ? previewTask : null}
                isCritical={criticalPathIds.has(task.id)}
                isLinking={!!linkingState && linkingState.sourceId !== task.id}
                startDate={startDate}
                endDate={endDate}
                dayWidth={DAY_WIDTH}
                onDragStart={handleDragStart}
                onLinkStart={handleLinkStart}
                isDragging={dragState.taskId === task.id}
                onTaskClick={onTaskClick}
              />
            ))}

            {regularTasks.length === 0 && (
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                Nenhuma tarefa encontrada. Adicione uma nova tarefa para começar.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ghost line overlay — fixed position while dragging a link */}
      {linkingState && ghostSourcePos && (
        <div className="fixed inset-0 pointer-events-none z-[9999]">
          <svg className="w-full h-full overflow-visible">
            <defs>
              <marker id="ghost-arrow" markerWidth="7" markerHeight="7" refX="7" refY="3.5" orient="auto">
                <polygon points="0 0, 7 3.5, 0 7" fill="rgb(249, 115, 22)" />
              </marker>
            </defs>
            <line
              x1={ghostSourcePos.x}
              y1={ghostSourcePos.y}
              x2={linkingState.mouseX}
              y2={linkingState.mouseY}
              stroke="rgba(249, 115, 22, 0.85)"
              strokeWidth={2}
              strokeDasharray="6 3"
              markerEnd="url(#ghost-arrow)"
            />
          </svg>
        </div>
      )}
    </>
  );
};
