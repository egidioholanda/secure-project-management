import { eachDayOfInterval, format } from 'date-fns';
import type { Task } from '@/types/schedule';
import { GanttTaskBar } from './GanttTaskBar';
import { cn } from '@/lib/utils';

interface GanttRowProps {
  task: Task;
  previewTask: Task | null;
  isCritical: boolean;
  isLinking: boolean;
  startDate: Date;
  endDate: Date;
  dayWidth: number;
  onDragStart: (e: React.MouseEvent, taskId: string, type: 'move' | 'resize-start' | 'resize-end') => void;
  onLinkStart: (e: React.MouseEvent, taskId: string) => void;
  isDragging: boolean;
  onTaskClick: (task: Task) => void;
}

export const GanttRow = ({
  task,
  previewTask,
  isCritical,
  isLinking,
  startDate,
  endDate,
  dayWidth,
  onDragStart,
  onLinkStart,
  isDragging,
  onTaskClick,
}: GanttRowProps) => {
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const effectiveTask = previewTask ?? task;

  return (
    <div className="relative h-12 border-b border-border flex">
      {/* Background grid */}
      {days.map((day, idx) => {
        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
        const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
        return (
          <div
            key={idx}
            className={cn(
              'flex-shrink-0 border-r border-border/50',
              isWeekend && 'bg-muted/30',
              isToday && 'bg-primary/5'
            )}
            style={{ width: dayWidth }}
          />
        );
      })}

      {/* Task bar */}
      <GanttTaskBar
        task={effectiveTask}
        startDate={startDate}
        dayWidth={dayWidth}
        isCritical={isCritical}
        isLinking={isLinking}
        onDragStart={onDragStart}
        onLinkStart={onLinkStart}
        isDragging={isDragging}
        onClick={() => onTaskClick(task)}
      />
    </div>
  );
};
