import { differenceInDays } from 'date-fns';
import type { Task } from '@/types/schedule';

export type TaskStatus = 'completed' | 'on-track' | 'at-risk' | 'overdue' | 'blocked';

export const getTaskStatus = (task: Task, today: Date = new Date()): TaskStatus => {
  // Manual override — stays purple regardless of dates/progress until unmarked.
  if (task.blockedByClient) return 'blocked';
  if (task.progress >= 100) return 'completed';

  const todayMs = today.getTime();
  if (task.endDate.getTime() < todayMs) return 'overdue';
  if (task.startDate.getTime() > todayMs) return 'on-track';

  const totalDays = Math.max(1, differenceInDays(task.endDate, task.startDate));
  const elapsedDays = Math.max(0, differenceInDays(today, task.startDate));
  const timeElapsed = (elapsedDays / totalDays) * 100;

  if (timeElapsed - task.progress > 30) return 'at-risk';
  if (timeElapsed >= 80 && task.progress < 50) return 'at-risk';

  return 'on-track';
};

export interface StatusColors {
  bg: string;
  border: string;
  progress: string;
  text: string;
  dot: string;
}

export const STATUS_COLORS: Record<TaskStatus, StatusColors> = {
  completed: { bg: '#10B98115', border: '#10B981', progress: '#10B981', text: '#059669', dot: '#10B981' },
  'on-track': { bg: '#3B82F612', border: '#3B82F6', progress: '#3B82F6', text: '#2563EB', dot: '#3B82F6' },
  'at-risk':  { bg: '#F59E0B15', border: '#F59E0B', progress: '#F59E0B', text: '#D97706', dot: '#F59E0B' },
  overdue:    { bg: '#EF444415', border: '#EF4444', progress: '#EF4444', text: '#DC2626', dot: '#EF4444' },
  blocked:    { bg: '#8B5CF615', border: '#8B5CF6', progress: '#8B5CF6', text: '#7C3AED', dot: '#8B5CF6' },
};

export const STATUS_LABELS: Record<TaskStatus, string> = {
  completed: 'Concluída',
  'on-track': 'No prazo',
  'at-risk': 'Em risco',
  overdue: 'Atrasada',
  blocked: 'Parado (cliente)',
};

/**
 * Critical path: for each project, tasks whose end date equals the latest
 * non-completed task end date determine the project completion — those are critical.
 */
export const getCriticalPath = (tasks: Task[]): Set<string> => {
  const byProject: Record<string, Task[]> = {};
  tasks.forEach((task) => {
    if (!task.isMilestone) {
      if (!byProject[task.projectId]) byProject[task.projectId] = [];
      byProject[task.projectId].push(task);
    }
  });

  const criticalIds = new Set<string>();

  for (const projectTasks of Object.values(byProject)) {
    const active = projectTasks.filter((t) => t.progress < 100);
    if (active.length === 0) continue;
    const latestMs = Math.max(...active.map((t) => t.endDate.getTime()));
    active
      .filter((t) => t.endDate.getTime() === latestMs)
      .forEach((t) => criticalIds.add(t.id));
  }

  return criticalIds;
};

export const getOverallProgress = (tasks: Task[]): number => {
  const regular = tasks.filter((t) => !t.isMilestone);
  if (regular.length === 0) return 0;
  return Math.round(regular.reduce((s, t) => s + t.progress, 0) / regular.length);
};

export const getEstimatedDelivery = (tasks: Task[]): Date | null => {
  const active = tasks.filter((t) => !t.isMilestone && t.progress < 100);
  if (active.length === 0) return null;
  return new Date(Math.max(...active.map((t) => t.endDate.getTime())));
};

export const countByStatus = (tasks: Task[], today: Date = new Date()) => {
  const regular = tasks.filter((t) => !t.isMilestone);
  return regular.reduce(
    (acc, task) => {
      acc[getTaskStatus(task, today)] += 1;
      return acc;
    },
    { completed: 0, 'on-track': 0, 'at-risk': 0, overdue: 0, blocked: 0 } as Record<TaskStatus, number>
  );
};
