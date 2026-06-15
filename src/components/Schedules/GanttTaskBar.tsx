import { useMemo } from 'react';
import { differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { Task } from '@/types/schedule';
import { cn } from '@/lib/utils';
import { Flag, Link } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getTaskStatus, STATUS_COLORS, STATUS_LABELS } from '@/utils/ganttUtils';

interface GanttTaskBarProps {
  task: Task;
  startDate: Date;
  dayWidth: number;
  isCritical: boolean;
  isLinking: boolean;             // another task is being linked (show target highlight)
  onDragStart: (e: React.MouseEvent, taskId: string, type: 'move' | 'resize-start' | 'resize-end') => void;
  onLinkStart: (e: React.MouseEvent, taskId: string) => void;
  isDragging: boolean;
  onClick: () => void;
}

export const GanttTaskBar = ({
  task,
  startDate,
  dayWidth,
  isCritical,
  isLinking,
  onDragStart,
  onLinkStart,
  isDragging,
  onClick,
}: GanttTaskBarProps) => {
  const today = useMemo(() => new Date(), []);
  const status = useMemo(() => getTaskStatus(task, today), [task, today]);
  const colors = STATUS_COLORS[status];

  const offsetDays = differenceInDays(task.startDate, startDate);
  const durationDays = Math.max(1, differenceInDays(task.endDate, task.startDate) + 1);
  const left = offsetDays * dayWidth;
  const width = durationDays * dayWidth;

  if (task.isMilestone) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              id={`gantt-bar-${task.id}`}
              data-task-id={task.id}
              className="absolute top-1/2 -translate-y-1/2 cursor-pointer z-10 hover:scale-125 transition-transform"
              style={{ left: left + dayWidth / 2 - 10 }}
              onClick={onClick}
            >
              <div
                className="w-5 h-5 rotate-45 border-2 flex items-center justify-center shadow-md"
                style={{ backgroundColor: task.color, borderColor: task.color }}
              >
                <Flag className="w-2.5 h-2.5 -rotate-45 text-white" />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="font-semibold text-sm">{task.name}</p>
            <p className="text-xs text-muted-foreground">
              Marco — {format(task.startDate, "dd 'de' MMM", { locale: ptBR })}
            </p>
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
            id={`gantt-bar-${task.id}`}
            data-task-id={task.id}
            className={cn(
              'absolute top-1/2 -translate-y-1/2 h-8 rounded-md cursor-pointer group transition-all duration-150',
              isDragging && 'opacity-80 shadow-lg scale-105 z-30',
              isCritical && 'ring-2 ring-offset-1 ring-destructive/70',
              isLinking && 'ring-2 ring-orange-400/80 ring-offset-1'
            )}
            style={{
              left,
              width: Math.max(width, 24),
              backgroundColor: colors.bg,
              border: `2px solid ${colors.border}`,
            }}
            onClick={onClick}
          >
            {/* Resize handle — left */}
            <div
              className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 flex items-center justify-center z-10"
              onMouseDown={(e) => onDragStart(e, task.id, 'resize-start')}
            >
              <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: colors.border }} />
            </div>

            {/* Task content — move zone */}
            <div
              className="absolute inset-0 flex items-center px-2 cursor-move overflow-hidden"
              onMouseDown={(e) => onDragStart(e, task.id, 'move')}
            >
              {/* Progress fill */}
              <div
                className="absolute left-0 top-0 bottom-0 rounded-l-sm opacity-50 transition-all duration-300"
                style={{ width: `${task.progress}%`, backgroundColor: colors.progress }}
              />
              {width > 50 && (
                <span
                  className="relative z-10 text-xs font-semibold truncate select-none"
                  style={{ color: colors.text }}
                >
                  {task.name}
                </span>
              )}
            </div>

            {/* Resize handle — right */}
            <div
              className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize opacity-0 group-hover:opacity-100 flex items-center justify-center z-10"
              onMouseDown={(e) => onDragStart(e, task.id, 'resize-end')}
            >
              <div className="w-0.5 h-4 rounded-full" style={{ backgroundColor: colors.border }} />
            </div>

            {/* Link handle — outside right edge, creates dependency on drag */}
            <div
              className={cn(
                'absolute top-1/2 -translate-y-1/2 -right-5 w-4 h-4 rounded-full border-2 border-background',
                'flex items-center justify-center cursor-crosshair z-20',
                'opacity-0 group-hover:opacity-100 transition-opacity hover:scale-125',
              )}
              style={{ backgroundColor: 'rgb(249, 115, 22)' }}
              onMouseDown={(e) => { e.stopPropagation(); onLinkStart(e, task.id); }}
              title="Arrastar para criar dependência"
            >
              <Link className="w-2 h-2 text-white" />
            </div>

            {/* Critical path dot */}
            {isCritical && (
              <div className="absolute -top-2 -right-1 w-2.5 h-2.5 bg-destructive rounded-full border border-background z-20" />
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm">{task.name}</p>
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}
            >
              {STATUS_LABELS[status]}
            </span>
            {isCritical && (
              <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-destructive/10 text-destructive border border-destructive/30">
                Crítico
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {format(task.startDate, 'dd/MM/yyyy', { locale: ptBR })} →{' '}
            {format(task.endDate, 'dd/MM/yyyy', { locale: ptBR })}
          </p>
          <p className="text-xs text-muted-foreground">Progresso: {task.progress}%</p>
          {task.assignee && (
            <p className="text-xs text-muted-foreground">Responsável: {task.assignee}</p>
          )}
          {task.dependencies && task.dependencies.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Depende de {task.dependencies.length} tarefa(s)
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
