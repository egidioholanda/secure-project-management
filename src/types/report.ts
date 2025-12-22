export interface ReportPhoto {
  id: string;
  url: string;
  caption: string;
  createdAt: Date;
}

export interface TaskProgress {
  id: string;
  name: string;
  progress: number;
  status: 'pending' | 'in_progress' | 'completed';
  assignee: string;
}

export interface Report {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  createdAt: Date;
  author: string;
  status: 'draft' | 'published';
  period: {
    start: Date;
    end: Date;
  };
  summary: string;
  observations: string;
  challenges: string;
  nextSteps: string;
  photos: ReportPhoto[];
  tasks: TaskProgress[];
}
