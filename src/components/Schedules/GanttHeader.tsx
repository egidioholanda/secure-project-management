import { format, eachDayOfInterval, eachWeekOfInterval, eachMonthOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface GanttHeaderProps {
  startDate: Date;
  endDate: Date;
  dayWidth: number;
  viewMode: 'day' | 'week' | 'month';
}

export const GanttHeader = ({ startDate, endDate, dayWidth, viewMode }: GanttHeaderProps) => {
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  
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

  const getWeekHeaders = () => {
    return days.map((day, idx) => {
      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
      const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
      
      return (
        <div
          key={idx}
          className={cn(
            "flex-shrink-0 border-r border-border text-center text-xs py-1",
            isWeekend && "bg-muted/70",
            isToday && "bg-primary/10"
          )}
          style={{ width: dayWidth }}
        >
          <div className="font-medium text-muted-foreground capitalize">
            {format(day, 'EEE', { locale: ptBR })}
          </div>
          <div className={cn("font-bold", isToday && "text-primary")}>
            {format(day, 'd')}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="sticky top-0 z-20 bg-card border-b border-border">
      {/* Month row */}
      <div className="flex border-b border-border">
        {getMonthHeaders()}
      </div>
      {/* Day row */}
      <div className="flex">
        {getWeekHeaders()}
      </div>
    </div>
  );
};
