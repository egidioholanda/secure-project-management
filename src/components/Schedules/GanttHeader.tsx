import { format, eachDayOfInterval, eachMonthOfInterval, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Task } from '@/types/schedule';
import type { CalendarConfig } from '@/utils/workingDaysEngine';
import { DEFAULT_CALENDAR_CONFIG, isWorkingDay } from '@/utils/workingDaysEngine';

interface GanttHeaderProps {
  startDate: Date;
  endDate: Date;
  dayWidth: number;
  viewMode: 'day' | 'week' | 'month';
  milestoneTasks: Task[];
  calendarConfig?: CalendarConfig;
}

export const GanttHeader = ({
  startDate,
  endDate,
  dayWidth,
  milestoneTasks,
  calendarConfig = DEFAULT_CALENDAR_CONFIG,
}: GanttHeaderProps) => {
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const getMonthHeaders = () => {
    const months = eachMonthOfInterval({ start: startDate, end: endDate });
    return months.map((month, idx) => {
      const daysInMonth = days.filter(
        (d) => d.getMonth() === month.getMonth() && d.getFullYear() === month.getFullYear()
      ).length;
      return (
        <div
          key={idx}
          className="flex-shrink-0 border-r border-border px-2 py-1.5 text-sm font-semibold bg-muted/50 text-foreground capitalize"
          style={{ width: daysInMonth * dayWidth }}
        >
          {format(month, 'MMMM yyyy', { locale: ptBR })}
        </div>
      );
    });
  };

  const getDayHeaders = () => {
    return days.map((day, idx) => {
      const working = isWorkingDay(day, calendarConfig);
      const isToday = format(day, 'yyyy-MM-dd') === todayStr;

      return (
        <div
          key={idx}
          className={cn(
            'flex-shrink-0 border-r border-border text-center text-xs py-1 transition-colors',
            !working && 'bg-muted/70',
            isToday && 'bg-primary/10'
          )}
          style={{ width: dayWidth }}
        >
          <div className={cn('font-medium capitalize', !working ? 'text-muted-foreground/60' : 'text-muted-foreground')}>
            {format(day, 'EEE', { locale: ptBR })}
          </div>
          <div className={cn('font-bold', isToday && 'text-primary', !working && 'text-muted-foreground/60')}>
            {format(day, 'd')}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="sticky top-0 z-20 bg-card border-b border-border">
      {/* Month row */}
      <div className="flex border-b border-border">{getMonthHeaders()}</div>
      {/* Day row */}
      <div className="flex border-b border-border">{getDayHeaders()}</div>

      {/* Milestone row */}
      <div className="relative flex h-8 bg-muted/20 border-b border-border">
        {days.map((day, idx) => {
          const working = isWorkingDay(day, calendarConfig);
          return (
            <div
              key={idx}
              className={cn(
                'flex-shrink-0 border-r border-border/30',
                !working && 'bg-muted/40'
              )}
              style={{ width: dayWidth }}
            />
          );
        })}

        {/* Milestone diamonds */}
        <TooltipProvider>
          {milestoneTasks.map((milestone) => {
            const offset = differenceInDays(milestone.startDate, startDate);
            if (offset < 0 || offset > days.length) return null;
            const left = offset * dayWidth + dayWidth / 2;

            return (
              <Tooltip key={milestone.id}>
                <TooltipTrigger asChild>
                  <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rotate-45 cursor-pointer hover:scale-125 transition-transform z-10"
                    style={{ left, backgroundColor: milestone.color, border: `2px solid ${milestone.color}` }}
                  />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="bg-popover text-popover-foreground">
                  <p className="font-semibold text-sm">{milestone.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {format(milestone.startDate, "dd 'de' MMM yyyy", { locale: ptBR })}
                  </p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>

        <div className="absolute left-0 top-0 bottom-0 flex items-center px-2 pointer-events-none">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
            {milestoneTasks.length > 0 ? 'Marcos' : ''}
          </span>
        </div>
      </div>
    </div>
  );
};
