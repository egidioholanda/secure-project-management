import { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import type { Task } from '@/types/schedule';
import { GanttHeader } from './GanttHeader';
import { GanttRow } from './GanttRow';
import { GanttSidebar } from './GanttSidebar';
import { DependencyArrows } from './DependencyArrows';
import { useGanttDrag } from '@/hooks/useGanttDrag';
import { getCriticalPath, getTaskStatus, STATUS_COLORS } from '@/utils/ganttUtils';
import type { TaskStatus } from '@/utils/ganttUtils';
import { eachDayOfInterval } from 'date-fns';
import { cn } from '@/lib/utils';
import type { CalendarConfig } from '@/utils/workingDaysEngine';
import { DEFAULT_CALENDAR_CONFIG } from '@/utils/workingDaysEngine';
import type { ProjectGroup, DisplayRow } from './ganttTypes';

export type { ProjectGroup, DisplayRow };

const DAY_WIDTH = 40;
const ROW_HEIGHT = 48;

const STATUS_PRIORITY: Record<TaskStatus, number> = {
  overdue: 3,
  'at-risk': 2,
  'on-track': 1,
  completed: 0,
};

interface LinkingState {
  sourceId: string;
  mouseX: number;
  mouseY: number;
}

interface GanttChartProps {
  tasks: Task[];
  onUpdateTask: (task: Task) => void;
  onUpdateMultiple: (tasks: Task[]) => void;
  onAddDependency: (sourceId: string, targetId: string) => void;
  onRemoveDependency: (taskId: string, depId: string) => void;
  onTaskClick: (task: Task) => void;
  startDate: Date;
  endDate: Date;
  calendarConfig?: CalendarConfig;
  onReorder?: (orderedIds: string[]) => void;
}

export const GanttChart = ({
  tasks,
  onUpdateTask,
  onUpdateMultiple,
  onAddDependency,
  onRemoveDependency,
  onTaskClick,
  startDate,
  endDate,
  calendarConfig = DEFAULT_CALENDAR_CONFIG,
  onReorder,
}: GanttChartProps) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [linkingState, setLinkingState] = useState<LinkingState | null>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const { dragState, previewTask, handleDragStart, handleDragMove, handleDragEnd, isDragging } =
    useGanttDrag(tasks, onUpdateTask, onUpdateMultiple, DAY_WIDTH, calendarConfig);

  const milestoneTasks = useMemo(() => tasks.filter((t) => t.isMilestone), [tasks]);
  const regularTasks = useMemo(() => tasks.filter((t) => !t.isMilestone), [tasks]);
  const criticalPathIds = useMemo(() => getCriticalPath(tasks), [tasks]);
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const totalChartWidth = days.length * DAY_WIDTH;

  const toggleProject = useCallback((projectId: string) => {
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      next.has(projectId) ? next.delete(projectId) : next.add(projectId);
      return next;
    });
  }, []);

  // Group tasks by project, preserving the ordering of the task list
  const projectGroups = useMemo((): ProjectGroup[] => {
    const map = new Map<string, ProjectGroup>();
    for (const task of regularTasks) {
      if (!map.has(task.projectId)) {
        map.set(task.projectId, {
          projectId: task.projectId,
          projectName: task.projectName,
          color: task.color,
          tasks: [],
          avgProgress: 0,
          minStart: task.startDate,
          maxEnd: task.endDate,
        });
      }
      const g = map.get(task.projectId)!;
      g.tasks.push(task);
      if (task.startDate < g.minStart) g.minStart = task.startDate;
      if (task.endDate > g.maxEnd) g.maxEnd = task.endDate;
    }
    // Compute average progress and status-based color per group
    const now = new Date();
    for (const g of map.values()) {
      g.avgProgress = g.tasks.length > 0
        ? Math.round(g.tasks.reduce((s, t) => s + t.progress, 0) / g.tasks.length)
        : 0;

      let worst: TaskStatus = 'completed';
      for (const t of g.tasks) {
        const s = getTaskStatus(t, now);
        if (STATUS_PRIORITY[s] > STATUS_PRIORITY[worst]) worst = s;
      }
      g.statusColor = STATUS_COLORS[worst].dot;
    }
    return Array.from(map.values());
  }, [regularTasks]);

  // Flat list of what's actually rendered (project header + tasks when expanded)
  const displayRows = useMemo((): DisplayRow[] => {
    const rows: DisplayRow[] = [];
    for (const group of projectGroups) {
      rows.push({ type: 'project', group });
      if (expandedProjects.has(group.projectId)) {
        for (const task of group.tasks) {
          rows.push({ type: 'task', task });
        }
      }
    }
    return rows;
  }, [projectGroups, expandedProjects]);

  // Only the visible task rows (for dependency arrows)
  const visibleTasks = useMemo(
    () => displayRows.filter((r): r is { type: 'task'; task: Task } => r.type === 'task').map((r) => r.task),
    [displayRows],
  );

  // Map from task ID to its actual Y centre in the chart (accounts for project header rows)
  const taskYOffsets = useMemo((): Map<string, number> => {
    const map = new Map<string, number>();
    displayRows.forEach((row, idx) => {
      if (row.type === 'task') {
        map.set(row.task.id, (idx + 0.5) * ROW_HEIGHT);
      }
    });
    return map;
  }, [displayRows]);

  const totalChartHeight = displayRows.length * ROW_HEIGHT;

  // ─── Drag event listeners ──────────────────────────────────────────────────
  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (isDragging) handleDragMove(e as unknown as React.MouseEvent); };
    const onUp = () => { if (isDragging) handleDragEnd(); };
    if (isDragging) {
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [isDragging, handleDragMove, handleDragEnd]);

  // ─── Link (dependency) event listeners ────────────────────────────────────
  useEffect(() => {
    if (!linkingState) return;

    const onMove = (e: MouseEvent) => {
      setLinkingState((prev) => prev ? { ...prev, mouseX: e.clientX, mouseY: e.clientY } : null);
    };

    const onUp = (e: MouseEvent) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const barEl = el?.closest('[data-task-id]');
      const targetId = barEl?.getAttribute('data-task-id');
      if (targetId && targetId !== linkingState.sourceId) {
        onAddDependency(linkingState.sourceId, targetId);
      }
      setLinkingState(null);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    return () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
  }, [linkingState, onAddDependency]);

  // Scroll to today on mount
  useEffect(() => {
    if (chartRef.current) {
      const daysFromStart = Math.floor(
        (new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
      );
      chartRef.current.scrollLeft = Math.max(0, daysFromStart * DAY_WIDTH - 200);
    }
  }, [startDate]);

  const todayOffset = Math.floor(
    (new Date().getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  const ghostSourcePos = useMemo(() => {
    if (!linkingState) return null;
    const el = document.getElementById(`gantt-bar-${linkingState.sourceId}`);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return { x: rect.right, y: (rect.top + rect.bottom) / 2 };
  }, [linkingState]);

  const handleLinkStart = (e: React.MouseEvent, sourceId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setLinkingState({ sourceId, mouseX: e.clientX, mouseY: e.clientY });
  };

  return (
    <>
      <div
        className={cn(
          'flex h-full bg-card rounded-lg border border-border overflow-hidden',
          (isDragging || linkingState) && 'select-none',
          linkingState && 'cursor-crosshair'
        )}
      >
        {/* Sidebar */}
        <GanttSidebar
          displayRows={displayRows}
          expandedProjects={expandedProjects}
          onToggleProject={toggleProject}
          milestoneTasks={milestoneTasks}
          selectedTaskId={dragState.taskId}
          onTaskSelect={onTaskClick}
          onReorder={onReorder}
        />

        {/* Chart area */}
        <div ref={chartRef} className="flex-1 overflow-auto relative">
          <GanttHeader
            startDate={startDate}
            endDate={endDate}
            dayWidth={DAY_WIDTH}
            viewMode="day"
            milestoneTasks={milestoneTasks}
            calendarConfig={calendarConfig}
          />

          {/* Rows + SVG overlay */}
          <div className="relative" style={{ minWidth: totalChartWidth }}>
            {/* Today line */}
            {todayOffset >= 0 && todayOffset <= days.length && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-destructive z-30 pointer-events-none"
                style={{ left: todayOffset * DAY_WIDTH + DAY_WIDTH / 2 }}
              >
                <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-destructive rounded-full" />
              </div>
            )}

            {/* Dependency arrows — only for visible tasks */}
            <DependencyArrows
              tasks={visibleTasks}
              taskYOffsets={taskYOffsets}
              startDate={startDate}
              dayWidth={DAY_WIDTH}
              totalWidth={totalChartWidth}
              totalHeight={totalChartHeight}
              onRemoveDependency={onRemoveDependency}
            />

            {displayRows.map((row) => {
              if (row.type === 'project') {
                const { group } = row;
                const startOffset = Math.max(0,
                  Math.floor((group.minStart.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
                );
                const endOffset = Math.min(days.length,
                  Math.ceil((group.maxEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1
                );
                const barLeft = startOffset * DAY_WIDTH;
                const barWidth = Math.max(DAY_WIDTH, (endOffset - startOffset) * DAY_WIDTH);

                return (
                  <div
                    key={`project-${group.projectId}`}
                    className="relative h-12 border-b border-border bg-muted/20 flex items-center cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => toggleProject(group.projectId)}
                  >
                    {/* Project span bar */}
                    {startOffset < days.length && (
                      <div
                        className="absolute top-3 h-6 rounded flex items-center overflow-hidden"
                        style={{ left: barLeft, width: barWidth, backgroundColor: group.statusColor + '30', border: `1.5px solid ${group.statusColor}60` }}
                      >
                        {/* Progress fill */}
                        <div
                          className="absolute left-0 top-0 h-full rounded transition-all duration-300"
                          style={{ width: `${group.avgProgress}%`, backgroundColor: group.statusColor + '50' }}
                        />
                        <span
                          className="relative z-10 px-2 text-xs font-semibold truncate"
                          style={{ color: group.statusColor }}
                        >
                          {group.avgProgress}%
                        </span>
                      </div>
                    )}
                  </div>
                );
              }

              // type === 'task'
              const { task } = row;
              return (
                <GanttRow
                  key={task.id}
                  task={task}
                  previewTask={previewTask?.id === task.id ? previewTask : null}
                  isCritical={criticalPathIds.has(task.id)}
                  isLinking={!!linkingState && linkingState.sourceId !== task.id}
                  startDate={startDate}
                  endDate={endDate}
                  dayWidth={DAY_WIDTH}
                  onDragStart={handleDragStart}
                  onLinkStart={handleLinkStart}
                  isDragging={dragState.taskId === task.id}
                  onTaskClick={onTaskClick}
                  calendarConfig={calendarConfig}
                />
              );
            })}

            {displayRows.length === 0 && (
              <div className="flex items-center justify-center h-48 text-muted-foreground">
                Nenhuma tarefa encontrada. Adicione uma nova tarefa para começar.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Ghost line overlay */}
      {linkingState && ghostSourcePos && (
        <div className="fixed inset-0 pointer-events-none z-[9999]">
          <svg className="w-full h-full overflow-visible">
            <defs>
              <marker id="ghost-arrow" markerWidth="7" markerHeight="7" refX="7" refY="3.5" orient="auto">
                <polygon points="0 0, 7 3.5, 0 7" fill="rgb(249, 115, 22)" />
              </marker>
            </defs>
            <line
              x1={ghostSourcePos.x}
              y1={ghostSourcePos.y}
              x2={linkingState.mouseX}
              y2={linkingState.mouseY}
              stroke="rgba(249, 115, 22, 0.85)"
              strokeWidth={2}
              strokeDasharray="6 3"
              markerEnd="url(#ghost-arrow)"
            />
          </svg>
        </div>
      )}
    </>
  );
};
