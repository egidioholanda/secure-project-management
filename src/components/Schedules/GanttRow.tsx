import { eachDayOfInterval, format } from 'date-fns';
import { Task } from '@/types/schedule';
import { GanttTaskBar } from './GanttTaskBar';
import { cn } from '@/lib/utils';

interface GanttRowProps {
  task: Task;
  startDate: Date;
  endDate: Date;
  dayWidth: number;
  onDragStart: (e: React.MouseEvent, taskId: string, type: 'move' | 'resize-start' | 'resize-end') => void;
  isDragging: boolean;
  onTaskClick: (task: Task) => void;
}

export const GanttRow = ({
  task,
  startDate,
  endDate,
  dayWidth,
  onDragStart,
  isDragging,
  onTaskClick,
}: GanttRowProps) => {
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const totalWidth = days.length * dayWidth;

  return (
    <div className="relative h-12 border-b border-border flex">
      {/* Grid cells */}
      {days.map((day, idx) => {
        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
        const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
        
        return (
          <div
            key={idx}
            className={cn(
              "flex-shrink-0 border-r border-border/50",
              isWeekend && "bg-muted/30",
              isToday && "bg-primary/5"
            )}
            style={{ width: dayWidth }}
          />
        );
      })}
      
      {/* Task bar */}
      <GanttTaskBar
        task={task}
        startDate={startDate}
        dayWidth={dayWidth}
        onDragStart={onDragStart}
        isDragging={isDragging}
        onClick={() => onTaskClick(task)}
      />
    </div>
  );
};
