import { useMemo } from 'react';
import type { Task } from '@/types/schedule';
import { cn } from '@/lib/utils';
import { Flag } from 'lucide-react';
import { getTaskStatus, STATUS_COLORS } from '@/utils/ganttUtils';

interface GanttSidebarProps {
  tasks: Task[];
  milestoneTasks: Task[];
  selectedTaskId: string | null;
  onTaskSelect: (task: Task) => void;
}

export const GanttSidebar = ({ tasks, milestoneTasks, selectedTaskId, onTaskSelect }: GanttSidebarProps) => {
  const today = useMemo(() => new Date(), []);

  // Group regular tasks by project
  const groupedTasks = tasks.reduce((acc, task) => {
    if (!acc[task.projectId]) {
      acc[task.projectId] = {
        projectName: task.projectName,
        projectColor: task.color,
        tasks: [],
      };
    }
    acc[task.projectId].tasks.push(task);
    return acc;
  }, {} as Record<string, { projectName: string; projectColor: string; tasks: Task[] }>);

  return (
    <div className="w-80 flex-shrink-0 border-r border-border bg-card">
      {/* Header — must match GanttHeader height exactly: month(28) + day(37) + milestone(33) = 98px */}
      <div className="sticky top-0 z-20 bg-card border-b border-border">
        <div className="h-[98px] flex items-end pb-2 px-4 bg-muted/50 border-b border-border">
          <span className="text-sm font-semibold text-foreground">Tarefas</span>
        </div>
      </div>

      {/* Milestones list (if any) */}
      {milestoneTasks.length > 0 && (
        <div className="border-b border-border bg-muted/10">
          <div className="px-4 py-1 flex items-center gap-2">
            <Flag className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Marcos</span>
          </div>
          {milestoneTasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                'h-10 flex items-center gap-3 px-4 border-t border-border/50 cursor-pointer hover:bg-muted/50 transition-colors',
                selectedTaskId === task.id && 'bg-primary/5'
              )}
              onClick={() => onTaskSelect(task)}
            >
              <div
                className="w-3 h-3 rotate-45 flex-shrink-0"
                style={{ backgroundColor: task.color }}
              />
              <p className="text-sm font-medium truncate text-foreground">{task.name}</p>
            </div>
          ))}
        </div>
      )}

      {/* Task list grouped by project */}
      <div>
        {Object.entries(groupedTasks).map(([projectId, group]) => (
          <div key={projectId}>
            {group.tasks.map((task) => {
              const status = getTaskStatus(task, today);
              const colors = STATUS_COLORS[status];

              return (
                <div
                  key={task.id}
                  className={cn(
                    'h-12 flex items-center gap-3 px-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors',
                    selectedTaskId === task.id && 'bg-primary/5'
                  )}
                  onClick={() => onTaskSelect(task)}
                >
                  {/* Project color bar */}
                  <div
                    className="w-1 h-6 rounded-full flex-shrink-0"
                    style={{ backgroundColor: task.color }}
                  />

                  {/* Task info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-foreground">{task.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{task.projectName}</p>
                  </div>

                  {/* Progress with semaphore color */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <div className="w-12 h-1.5 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{ width: `${task.progress}%`, backgroundColor: colors.progress }}
                      />
                    </div>
                    <span className="text-xs w-8 text-right" style={{ color: colors.text }}>
                      {task.progress}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
