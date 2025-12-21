import { Task } from '@/types/schedule';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface GanttSidebarProps {
  tasks: Task[];
  selectedTaskId: string | null;
  onTaskSelect: (task: Task) => void;
}

export const GanttSidebar = ({ tasks, selectedTaskId, onTaskSelect }: GanttSidebarProps) => {
  // Group tasks by project
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
      {/* Header */}
      <div className="sticky top-0 z-20 bg-card border-b border-border">
        <div className="h-[68px] flex items-end pb-2 px-4 border-b border-border bg-muted/50">
          <span className="text-sm font-semibold text-foreground">Tarefas</span>
        </div>
      </div>

      {/* Task list */}
      <div>
        {Object.entries(groupedTasks).map(([projectId, group]) => (
          <div key={projectId}>
            {group.tasks.map((task) => (
              <div
                key={task.id}
                className={cn(
                  "h-12 flex items-center gap-3 px-4 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors",
                  selectedTaskId === task.id && "bg-primary/5"
                )}
                onClick={() => onTaskSelect(task)}
              >
                {/* Color indicator */}
                <div
                  className="w-1 h-6 rounded-full flex-shrink-0"
                  style={{ backgroundColor: task.color }}
                />
                
                {/* Task info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">{task.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{task.projectName}</p>
                </div>

                {/* Progress */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Progress value={task.progress} className="w-12 h-1.5" />
                  <span className="text-xs text-muted-foreground w-8">{task.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
