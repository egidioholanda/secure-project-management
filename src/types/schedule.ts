export interface Task {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  assignee?: string;
  teamId?: string | null;
  projectId: string;
  projectName: string;
  color: string;
  dependencies?: string[];
  isMilestone?: boolean;
}

export interface Project {
  id: string;
  name: string;
  color: string;
}
