import { eachDayOfInterval, format } from 'date-fns';
import type { Task } from '@/types/schedule';
import { GanttTaskBar } from './GanttTaskBar';
import { cn } from '@/lib/utils';
import type { CalendarConfig } from '@/utils/workingDaysEngine';
import { DEFAULT_CALENDAR_CONFIG, isWorkingDay } from '@/utils/workingDaysEngine';

const NON_WORKING_STYLE: React.CSSProperties = {
  backgroundImage:
    'repeating-linear-gradient(-45deg, rgba(120,120,180,0.13) 0px, rgba(120,120,180,0.13) 1.5px, transparent 1.5px, transparent 7px)',
  backgroundColor: 'rgba(100,100,160,0.07)',
};

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
  calendarConfig?: CalendarConfig;
  isHighlighted?: boolean;
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
  calendarConfig = DEFAULT_CALENDAR_CONFIG,
  isHighlighted = false,
}: GanttRowProps) => {
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const effectiveTask = previewTask ?? task;
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  return (
    <div
      className={cn(
        'relative h-12 border-b border-border flex transition-colors duration-700',
        isHighlighted && 'ring-2 ring-inset ring-primary bg-primary/10 z-10'
      )}
    >
      {/* Background grid */}
      {days.map((day, idx) => {
        const working = isWorkingDay(day, calendarConfig);
        const isToday = format(day, 'yyyy-MM-dd') === todayStr;
        return (
          <div
            key={idx}
            className={cn('flex-shrink-0 border-r border-border/50', isToday && 'bg-primary/5')}
            style={{
              width: dayWidth,
              ...(!working && !isToday ? NON_WORKING_STYLE : {}),
            }}
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
