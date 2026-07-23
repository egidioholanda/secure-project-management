import type { Task } from '@/types/schedule';

export interface ProjectGroup {
  projectId: string;
  projectName: string;
  color: string;
  statusColor: string;
  tasks: Task[];
  avgProgress: number;
  minStart: Date;
  maxEnd: Date;
  teamName: string | null;
}

export type DisplayRow =
  | { type: 'project'; group: ProjectGroup }
  | { type: 'task'; task: Task };
