import { useState, useMemo, useEffect } from 'react';
import { addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Filter, Download, Loader2 } from 'lucide-react';
import { Task } from '@/types/schedule';
import { GanttChart } from '@/components/Schedules/GanttChart';
import { TaskEditDialog } from '@/components/Schedules/TaskEditDialog';
import { AddTaskDialog } from '@/components/Schedules/AddTaskDialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useScheduleTasks } from '@/hooks/useScheduleTasks';
import { useProjects } from '@/hooks/useProjects';

const Schedules = () => {
  const { tasks, loading, addTask, updateTask, deleteTask } = useScheduleTasks();
  const { projects: dbProjects, loading: projectsLoading } = useProjects();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [filterProject, setFilterProject] = useState<string>('all');
  
  // Date range for the chart
  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 7),
    end: addDays(new Date(), 45),
  });

  // Transform db projects to format needed by AddTaskDialog
  const projectsList = useMemo(() => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    return dbProjects.map((p, idx) => ({
      id: p.id,
      name: p.name,
      color: colors[idx % colors.length],
    }));
  }, [dbProjects]);

  // Filter tasks by project
  const filteredTasks = useMemo(() => {
    if (filterProject === 'all') return tasks;
    return tasks.filter((task) => task.projectId === filterProject);
  }, [tasks, filterProject]);

  const handleUpdateTask = async (updatedTask: Task) => {
    await updateTask(updatedTask);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setEditDialogOpen(true);
  };

  const handleSaveTask = async (task: Task) => {
    await updateTask(task);
    toast.success('Tarefa atualizada com sucesso!');
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTask(taskId);
  };

  const handleAddTask = async (newTask: Omit<Task, 'id'>) => {
    await addTask(newTask);
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

  if (loading || projectsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

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
        <AddTaskDialog projects={projectsList} onAdd={handleAddTask} />
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
                  {projectsList.map((project) => (
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
