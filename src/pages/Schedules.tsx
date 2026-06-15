import { useState, useMemo, useRef } from 'react';
import { addDays, subDays } from 'date-fns';
import { ChevronLeft, ChevronRight, Filter, Download, Loader2 } from 'lucide-react';
import type { Task } from '@/types/schedule';
import { GanttChart } from '@/components/Schedules/GanttChart';
import { TaskEditDialog } from '@/components/Schedules/TaskEditDialog';
import { AddTaskDialog } from '@/components/Schedules/AddTaskDialog';
import { SchedulePDFPreview } from '@/components/Schedules/SchedulePDFPreview';
import { ScheduleSummary } from '@/components/Schedules/ScheduleSummary';
import { CalendarConfigPopover } from '@/components/Schedules/CalendarConfigPopover';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { useScheduleTasks } from '@/hooks/useScheduleTasks';
import { useProjects } from '@/hooks/useProjects';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useCalendarConfig } from '@/hooks/useCalendarConfig';
import { exportScheduleToPDF } from '@/utils/exportSchedulePDF';

const Schedules = () => {
  const { tasks, loading, addTask, updateTask, updateMultipleTasks, addDependency, deleteTask } =
    useScheduleTasks();
  const { projects: dbProjects, loading: projectsLoading } = useProjects();
  const { settings: companySettings } = useCompanySettings();
  const { config: calendarConfig, updateConfig: updateCalendarConfig } = useCalendarConfig();
  const pdfRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [filterProject, setFilterProject] = useState<string>('all');

  const [dateRange, setDateRange] = useState({
    start: subDays(new Date(), 7),
    end: addDays(new Date(), 52),
  });

  const projectsList = useMemo(() => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    return dbProjects.map((p, idx) => ({
      id: p.id,
      name: p.name,
      color: colors[idx % colors.length],
    }));
  }, [dbProjects]);

  const filteredTasks = useMemo(() => {
    if (filterProject === 'all') return tasks;
    return tasks.filter((task) => task.projectId === filterProject);
  }, [tasks, filterProject]);

  const handleUpdateTask = async (updatedTask: Task) => updateTask(updatedTask);

  const handleUpdateMultiple = async (updatedTasks: Task[]) => {
    await updateMultipleTasks(updatedTasks);
    if (updatedTasks.length > 1)
      toast.success(`Ajuste em cascata: ${updatedTasks.length} tarefas atualizadas`);
  };

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setEditDialogOpen(true);
  };

  const handleSaveTask = async (task: Task) => {
    await updateTask(task);
    toast.success('Tarefa atualizada com sucesso!');
  };

  const filterLabel = useMemo(() => {
    if (filterProject === 'all') return 'Todos os projetos';
    return projectsList.find((p) => p.id === filterProject)?.name || 'Todos os projetos';
  }, [filterProject, projectsList]);

  const handleExportPDF = async () => {
    if (!pdfRef.current) return;
    setExporting(true);
    try {
      await exportScheduleToPDF(pdfRef.current, 'cronograma');
      toast.success('Cronograma exportado com sucesso!');
    } catch {
      toast.error('Erro ao exportar o cronograma.');
    } finally {
      setExporting(false);
    }
  };

  const navigateTimeline = (direction: 'prev' | 'next') => {
    const d = direction === 'prev' ? -14 : 14;
    setDateRange((prev) => ({ start: addDays(prev.start, d), end: addDays(prev.end, d) }));
  };

  const goToToday = () =>
    setDateRange({ start: subDays(new Date(), 7), end: addDays(new Date(), 52) });

  if (loading || projectsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-1">Cronogramas</h1>
          <p className="text-muted-foreground text-sm">
            Gantt interativo · semáforo · caminho crítico · dependências · calendário flexível
          </p>
        </div>
        <AddTaskDialog projects={projectsList} onAdd={addTask} />
      </div>

      {/* Summary cards */}
      {filteredTasks.length > 0 && <ScheduleSummary tasks={filteredTasks} />}

      {/* Toolbar */}
      <Card className="p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Timeline navigation */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateTimeline('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={goToToday}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigateTimeline('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {/* Legend */}
          <div className="hidden lg:flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm border-2 border-[#10B981] bg-[#10B98115] inline-block" />
              No prazo
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm border-2 border-[#F59E0B] bg-[#F59E0B15] inline-block" />
              Em risco
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-sm border-2 border-[#EF4444] bg-[#EF444415] inline-block" />
              Atrasada
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
              Dependência
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-destructive inline-block" />
              Crítico
            </span>
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="Filtrar por projeto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os projetos</SelectItem>
                  {projectsList.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: project.color }} />
                        {project.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <CalendarConfigPopover config={calendarConfig} onChange={updateCalendarConfig} />

            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleExportPDF}
              disabled={exporting}
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              PDF
            </Button>
          </div>
        </div>
      </Card>

      {/* Gantt */}
      <div className="flex-1 min-h-[500px]">
        <GanttChart
          tasks={filteredTasks}
          onUpdateTask={handleUpdateTask}
          onUpdateMultiple={handleUpdateMultiple}
          onAddDependency={addDependency}
          onTaskClick={handleTaskClick}
          startDate={dateRange.start}
          endDate={dateRange.end}
        />
      </div>

      <TaskEditDialog
        task={selectedTask}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveTask}
        onDelete={deleteTask}
      />

      <div className="fixed left-[-9999px] top-0 pointer-events-none">
        <SchedulePDFPreview
          ref={pdfRef}
          tasks={filteredTasks}
          startDate={dateRange.start}
          endDate={dateRange.end}
          companySettings={companySettings}
          filterLabel={filterLabel}
        />
      </div>
    </div>
  );
};

export default Schedules;
