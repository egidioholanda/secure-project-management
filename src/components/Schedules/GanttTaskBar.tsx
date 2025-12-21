import { differenceInDays } from 'date-fns';
import { Task } from '@/types/schedule';
import { cn } from '@/lib/utils';
import { GripVertical, Flag } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GanttTaskBarProps {
  task: Task;
  startDate: Date;
  dayWidth: number;
  onDragStart: (e: React.MouseEvent, taskId: string, type: 'move' | 'resize-start' | 'resize-end') => void;
  isDragging: boolean;
  onClick: () => void;
}

export const GanttTaskBar = ({
  task,
  startDate,
  dayWidth,
  onDragStart,
  isDragging,
  onClick,
}: GanttTaskBarProps) => {
  const offsetDays = differenceInDays(task.startDate, startDate);
  const durationDays = differenceInDays(task.endDate, task.startDate) + 1;
  
  const left = offsetDays * dayWidth;
  const width = durationDays * dayWidth;

  if (task.isMilestone) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="absolute top-1/2 -translate-y-1/2 cursor-pointer z-10"
              style={{ left: left + dayWidth / 2 - 12 }}
              onClick={onClick}
            >
              <div
                className="w-6 h-6 rotate-45 border-2 flex items-center justify-center"
                style={{ 
                  backgroundColor: task.color,
                  borderColor: task.color
                }}
              >
                <Flag className="w-3 h-3 -rotate-45 text-primary-foreground" />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="bg-popover text-popover-foreground">
            <div className="text-sm">
              <p className="font-semibold">{task.name}</p>
              <p className="text-muted-foreground">
                {format(task.startDate, "dd 'de' MMM", { locale: ptBR })}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 h-8 rounded-md cursor-pointer group transition-all",
              isDragging && "opacity-70 shadow-lg scale-105"
            )}
            style={{
              left,
              width: Math.max(width, 24),
              backgroundColor: `${task.color}20`,
              border: `2px solid ${task.color}`,
            }}
            onClick={onClick}
          >
            {/* Resize handle left */}
            <div
              className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 flex items-center justify-center"
              onMouseDown={(e) => onDragStart(e, task.id, 'resize-start')}
            >
              <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: task.color }} />
            </div>

            {/* Task content */}
            <div
              className="absolute inset-0 flex items-center px-2 cursor-move overflow-hidden"
              onMouseDown={(e) => onDragStart(e, task.id, 'move')}
            >
              {/* Progress bar */}
              <div
                className="absolute left-0 top-0 bottom-0 rounded-l-sm opacity-40"
                style={{
                  width: `${task.progress}%`,
                  backgroundColor: task.color,
                }}
              />
              
              {/* Task name */}
              <span
                className="relative z-10 text-xs font-medium truncate"
                style={{ color: task.color }}
              >
                {width > 60 && task.name}
              </span>
            </div>

            {/* Resize handle right */}
            <div
              className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 flex items-center justify-center"
              onMouseDown={(e) => onDragStart(e, task.id, 'resize-end')}
            >
              <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: task.color }} />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-popover text-popover-foreground">
          <div className="text-sm space-y-1">
            <p className="font-semibold">{task.name}</p>
            <p className="text-muted-foreground">
              {format(task.startDate, "dd/MM/yyyy", { locale: ptBR })} - {format(task.endDate, "dd/MM/yyyy", { locale: ptBR })}
            </p>
            <p className="text-muted-foreground">Progresso: {task.progress}%</p>
            {task.assignee && <p className="text-muted-foreground">Responsável: {task.assignee}</p>}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
