import { useMemo, useRef, useCallback, useEffect } from 'react';
import type { Task } from '@/types/schedule';
import { GanttHeader } from './GanttHeader';
import { GanttRow } from './GanttRow';
import { GanttSidebar } from './GanttSidebar';
import { useGanttDrag } from '@/hooks/useGanttDrag';
import { getCriticalPath } from '@/utils/ganttUtils';
import { eachDayOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';

const DAY_WIDTH = 40;

interface GanttChartProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
  onUpdateMultiple: (tasks: Task[]) => void;
  onTaskClick: (task: Task) => void;
  startDate: Date;
  endDate: Date;
}

export const GanttChart = ({
  tasks,
  onUpdateTask,
  onUpdateMultiple,
  onTaskClick,
  startDate,
  endDate,
}: GanttChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null);

  const { dragState, previewTask, handleDragStart, handleDragMove, handleDragEnd, isDragging } =
    useGanttDrag(tasks, onUpdateTask, onUpdateMultiple, DAY_WIDTH);

  // Separate milestones from regular tasks
  const milestoneTasks = useMemo(() => tasks.filter((t) => t.isMilestone), [tasks]);
  const regularTasks = useMemo(() => tasks.filter((t) => !t.isMilestone), [tasks]);

  // Critical path — recomputed whenever tasks change
  const criticalPathIds = useMemo(() => getCriticalPath(tasks), [tasks]);

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  // Global mouse handlers for drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) handleDragMove(e as unknown as React.MouseEvent);
    };
    const handleMouseUp = () => {
      if (isDragging) handleDragEnd();
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // Scroll to today on mount
  useEffect(() => {
    if (chartRef.current) {
      const today = new Date();
      const daysFromStart = Math.floor(
        (today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      const scrollPos = daysFromStart * DAY_WIDTH - 200;
      chartRef.current.scrollLeft = Math.max(0, scrollPos);
    }
  }, [startDate]);

  // Today line offset
  const todayOffset = Math.floor(
    (new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div
      className={cn(
        'flex h-full bg-card rounded-lg border border-border overflow-hidden',
        isDragging && 'select-none'
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
        {/* Header (months + days + milestone row) */}
        <GanttHeader
          startDate={startDate}
          endDate={endDate}
          dayWidth={DAY_WIDTH}
          viewMode="day"
          milestoneTasks={milestoneTasks}
        />

        {/* Task rows */}
        <div className="relative">
          {/* Today vertical line */}
          {todayOffset >= 0 && todayOffset <= days.length && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-destructive z-30 pointer-events-none"
              style={{ left: todayOffset * DAY_WIDTH + DAY_WIDTH / 2 }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-destructive rounded-full" />
            </div>
          )}

          {regularTasks.map((task) => (
            <GanttRow
              key={task.id}
              task={task}
              previewTask={previewTask?.id === task.id ? previewTask : null}
              isCritical={criticalPathIds.has(task.id)}
              startDate={startDate}
              endDate={endDate}
              dayWidth={DAY_WIDTH}
              onDragStart={handleDragStart}
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
  );
};
