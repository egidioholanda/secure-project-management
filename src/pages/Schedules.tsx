import { useState, useMemo } from 'react';
import { addDays, subDays, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { Calendar, ChevronLeft, ChevronRight, Filter, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { Task } from '@/types/schedule';
import { GanttChart } from '@/components/Schedules/GanttChart';
import { TaskEditDialog } from '@/components/Schedules/TaskEditDialog';
import { AddTaskDialog } from '@/components/Schedules/AddTaskDialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

// Sample data - replace with actual data from your backend
const sampleProjects = [
  { id: 'proj-1', name: 'Shopping Center Norte', color: '#3B82F6' },
  { id: 'proj-2', name: 'Condomínio Alphaville', color: '#10B981' },
  { id: 'proj-3', name: 'Banco Central - Sede', color: '#F59E0B' },
];

const initialTasks: Task[] = [
  {
    id: 'task-1',
    name: 'Levantamento de campo',
    startDate: new Date(2024, 11, 16),
    endDate: new Date(2024, 11, 20),
    progress: 100,
    assignee: 'Carlos Silva',
    projectId: 'proj-1',
    projectName: 'Shopping Center Norte',
    color: '#3B82F6',
  },
  {
    id: 'task-2',
    name: 'Projeto executivo CFTV',
    startDate: new Date(2024, 11, 18),
    endDate: new Date(2024, 11, 28),
    progress: 65,
    assignee: 'Ana Paula',
    projectId: 'proj-1',
    projectName: 'Shopping Center Norte',
    color: '#3B82F6',
  },
  {
    id: 'task-3',
    name: 'Instalação de câmeras',
    startDate: new Date(2024, 11, 26),
    endDate: new Date(2025, 0, 10),
    progress: 20,
    assignee: 'Equipe Técnica A',
    projectId: 'proj-1',
    projectName: 'Shopping Center Norte',
    color: '#3B82F6',
  },
  {
    id: 'task-4',
    name: 'Análise de segurança',
    startDate: new Date(2024, 11, 15),
    endDate: new Date(2024, 11, 18),
    progress: 100,
    assignee: 'Roberto Lima',
    projectId: 'proj-2',
    projectName: 'Condomínio Alphaville',
    color: '#10B981',
  },
  {
    id: 'task-5',
    name: 'Instalação controle de acesso',
    startDate: new Date(2024, 11, 20),
    endDate: new Date(2025, 0, 5),
    progress: 40,
    assignee: 'Equipe Técnica B',
    projectId: 'proj-2',
    projectName: 'Condomínio Alphaville',
    color: '#10B981',
  },
  {
    id: 'task-6',
    name: 'Entrega final',
    startDate: new Date(2025, 0, 15),
    endDate: new Date(2025, 0, 15),
    progress: 0,
    assignee: 'Carlos Silva',
    projectId: 'proj-1',
    projectName: 'Shopping Center Norte',
    color: '#3B82F6',
    isMilestone: true,
  },
  {
    id: 'task-7',
    name: 'Projeto alarme perimetral',
    startDate: new Date(2024, 11, 22),
    endDate: new Date(2025, 0, 8),
    progress: 30,
    assignee: 'Marcos Oliveira',
    projectId: 'proj-3',
    projectName: 'Banco Central - Sede',
    color: '#F59E0B',
  },
];

const Schedules = () => {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [filterProject, setFilterProject] = useState<string>('all');
  
  // Date range for the chart
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 7),
    end: addDays(new Date(), 45),
  });

  // Filter tasks by project
  const filteredTasks = useMemo(() => {
    if (filterProject === 'all') return tasks;
    return tasks.filter((task) => task.projectId === filterProject);
  }, [tasks, filterProject]);

  const handleUpdateTask = (updatedTask: Task) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === updatedTask.id ? updatedTask : task))
    );
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setEditDialogOpen(true);
  };

  const handleSaveTask = (task: Task) => {
    handleUpdateTask(task);
    toast.success('Tarefa atualizada com sucesso!');
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== taskId));
    toast.success('Tarefa excluída com sucesso!');
  };

  const handleAddTask = (newTask: Omit<Task, 'id'>) => {
    const task: Task = {
      ...newTask,
      id: `task-${Date.now()}`,
    };
    setTasks((prev) => [...prev, task]);
    toast.success('Tarefa adicionada com sucesso!');
  };

  const navigateTimeline = (direction: 'prev' | 'next') => {
    const days = direction === 'prev' ? -14 : 14;
    setDateRange((prev) => ({
      start: addDays(prev.start, days),
      end: addDays(prev.end, days),
    }));
  };

  const goToToday = () => {
    setDateRange({
      start: subDays(new Date(), 7),
      end: addDays(new Date(), 45),
    });
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Cronogramas</h1>
          <p className="text-muted-foreground">
            Gerencie cronogramas de projetos com gráfico de Gantt interativo
          </p>
        </div>
        <AddTaskDialog projects={sampleProjects} onAdd={handleAddTask} />
      </div>

      {/* Toolbar */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateTimeline('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={goToToday}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigateTimeline('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filtrar por projeto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os projetos</SelectItem>
                  {sampleProjects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: project.color }}
                        />
                        {project.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>
      </Card>

      {/* Gantt Chart */}
      <div className="flex-1 min-h-[500px]">
        <GanttChart
          tasks={filteredTasks}
          onUpdateTask={handleUpdateTask}
          onTaskClick={handleTaskClick}
          startDate={dateRange.start}
          endDate={dateRange.end}
        />
      </div>

      {/* Edit Dialog */}
      <TaskEditDialog
        task={selectedTask}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
      />
    </div>
  );
};

export default Schedules;
