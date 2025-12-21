import { useState, useRef, useCallback, useEffect } from 'react';
import { Task } from '@/types/schedule';
import { GanttHeader } from './GanttHeader';
import { GanttRow } from './GanttRow';
import { GanttSidebar } from './GanttSidebar';
import { useGanttDrag } from '@/hooks/useGanttDrag';
import { eachDayOfInterval, addDays, subDays, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface GanttChartProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
  onTaskClick: (task: Task) => void;
  startDate: Date;
  endDate: Date;
}

export const GanttChart = ({
  tasks,
  onUpdateTask,
  onTaskClick,
  startDate,
  endDate,
}: GanttChartProps) => {
  const [dayWidth, setDayWidth] = useState(40);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  const { dragState, handleDragStart, handleDragMove, handleDragEnd, isDragging } = useGanttDrag(
    tasks,
    onUpdateTask,
    dayWidth
  );

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  // Handle mouse events for dragging
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        handleDragMove(e as unknown as React.MouseEvent);
      }
    };

    const handleMouseUp = () => {
      if (isDragging) {
        handleDragEnd();
      }
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
      const daysFromStart = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const scrollPosition = daysFromStart * dayWidth - 200;
      chartRef.current.scrollLeft = Math.max(0, scrollPosition);
    }
  }, [startDate, dayWidth]);

  const handleTaskSelect = (task: Task) => {
    setSelectedTaskId(task.id);
    onTaskClick(task);
  };

  // Today line position
  const todayOffset = Math.floor((new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex h-full bg-card rounded-lg border border-border overflow-hidden",
        isDragging && "select-none"
      )}
    >
      {/* Sidebar with task list */}
      <GanttSidebar
        tasks={tasks}
        selectedTaskId={selectedTaskId}
        onTaskSelect={handleTaskSelect}
      />

      {/* Chart area */}
      <div ref={chartRef} className="flex-1 overflow-auto relative">
        {/* Header with dates */}
        <GanttHeader
          startDate={startDate}
          endDate={endDate}
          dayWidth={dayWidth}
          viewMode="day"
        />

        {/* Task rows */}
        <div className="relative">
          {/* Today line */}
          {todayOffset >= 0 && todayOffset <= days.length && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-destructive z-30 pointer-events-none"
              style={{ left: todayOffset * dayWidth + dayWidth / 2 }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-destructive rounded-full" />
            </div>
          )}

          {tasks.map((task) => (
            <GanttRow
              key={task.id}
              task={task}
              startDate={startDate}
              endDate={endDate}
              dayWidth={dayWidth}
              onDragStart={handleDragStart}
              isDragging={dragState.taskId === task.id}
              onTaskClick={handleTaskSelect}
            />
          ))}

          {tasks.length === 0 && (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              Nenhuma tarefa encontrada. Adicione uma nova tarefa para começar.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
