import { useState, useMemo, useRef, useEffect } from 'react';
import { addDays, subDays, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight, Filter, Download, Loader2, Search, X } from 'lucide-react';
import type { Task } from '@/types/schedule';
import { GanttChart } from '@/components/Schedules/GanttChart';
import { TaskEditDialog } from '@/components/Schedules/TaskEditDialog';
import { AddTaskDialog } from '@/components/Schedules/AddTaskDialog';
import { SchedulePDFPreview } from '@/components/Schedules/SchedulePDFPreview';
import { ScheduleSummary } from '@/components/Schedules/ScheduleSummary';
import { CalendarConfigPopover } from '@/components/Schedules/CalendarConfigPopover';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { useScheduleTasks } from '@/hooks/useScheduleTasks';
import { useProjects } from '@/hooks/useProjects';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useCalendarConfig } from '@/hooks/useCalendarConfig';
import { useTeams } from '@/hooks/useTeams';
import { exportScheduleToPDF } from '@/utils/exportSchedulePDF';

// ─── Status options (sincronizado com Projects) ───────────────────────────────

const PROJECT_STATUSES = [
  { value: 'planning',        label: 'Planejamento' },
  { value: 'execution',       label: 'Em Execução' },
  { value: 'completed',       label: 'Concluído' },
  { value: 'onhold',          label: 'Em Espera' },
  { value: 'stopped',         label: 'Parado' },
  { value: 'started_stopped', label: 'Iniciado/Parado' },
  { value: 'obra_civil',      label: 'Obra Civil' },
];

const ALL_STATUS_VALUES = PROJECT_STATUSES.map((s) => s.value);

// ─── Component ────────────────────────────────────────────────────────────────

const Schedules = () => {
  const { tasks, loading, addTask, updateTask, updateMultipleTasks, addDependency, removeDependency, deleteTask } =
    useScheduleTasks();
  const { projects: dbProjects, loading: projectsLoading } = useProjects();
  const { settings: companySettings } = useCompanySettings();
  const { config: calendarConfig, updateConfig: updateCalendarConfig } = useCalendarConfig();
  const { teams } = useTeams();
  const pdfRef = useRef<HTMLDivElement>(null);

  const [exporting, setExporting]         = useState(false);
  const [selectedTask, setSelectedTask]   = useState<Task | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [filterProject, setFilterProject]   = useState<string>('all');
  const [searchQuery, setSearchQuery]       = useState('');
  const [activeStatuses, setActiveStatuses] = useState<Set<string>>(new Set(ALL_STATUS_VALUES));
  const [projectSearch, setProjectSearch]   = useState('');
  const [filterTeam, setFilterTeam]         = useState<string>('all');
  const [taskOrder, setTaskOrder]           = useState<string[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('secureproject:taskOrder');
    if (saved) { try { setTaskOrder(JSON.parse(saved)); } catch {} }
  }, []);

  const [dateRange, setDateRange] = useState({
    start: startOfDay(subDays(new Date(), 7)),
    end: startOfDay(addDays(new Date(), 52)),
  });

  // ── Derived data ──────────────────────────────────────────────────────────

  const projectsList = useMemo(() => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
    return dbProjects.map((p, idx) => ({
      id: p.id,
      name: p.name,
      color: colors[idx % colors.length],
      status: p.status,
    }));
  }, [dbProjects]);

  // projectId → status lookup
  const projectStatusMap = useMemo(() => {
    const map: Record<string, string> = {};
    dbProjects.forEach((p) => { map[p.id] = p.status || 'planning'; });
    return map;
  }, [dbProjects]);

  // Projetos filtrados pelos status ativos + texto digitado
  const filteredProjectOptions = useMemo(() => {
    const q = projectSearch.toLowerCase().trim();
    return projectsList.filter((p) => {
      const statusOk = activeStatuses.has(p.status || 'planning');
      const nameOk   = !q || p.name.toLowerCase().includes(q);
      return statusOk && nameOk;
    });
  }, [projectsList, activeStatuses, projectSearch]);

  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Filter by selected project
    if (filterProject !== 'all') {
      result = result.filter((t) => t.projectId === filterProject);
    }

    // Filter by project status
    if (activeStatuses.size < ALL_STATUS_VALUES.length) {
      result = result.filter((t) => {
        const status = projectStatusMap[t.projectId] || 'planning';
        return activeStatuses.has(status);
      });
    }

    // Search by task name or project name
    const q = searchQuery.toLowerCase().trim();
    if (q) {
      result = result.filter(
        (t) => t.name.toLowerCase().includes(q) || t.projectName.toLowerCase().includes(q)
      );
    }

    // Filter by team
    if (filterTeam !== 'all') {
      result = result.filter((t) => t.teamId === filterTeam);
    }

    return result;
  }, [tasks, filterProject, activeStatuses, projectStatusMap, searchQuery, filterTeam]);

  const orderedTasks = useMemo(() => {
    if (taskOrder.length === 0) return filteredTasks;
    const orderMap = new Map(taskOrder.map((id, i) => [id, i]));
    return [...filteredTasks].sort((a, b) => {
      const ia = orderMap.has(a.id) ? orderMap.get(a.id)! : Infinity;
      const ib = orderMap.has(b.id) ? orderMap.get(b.id)! : Infinity;
      return ia - ib;
    });
  }, [filteredTasks, taskOrder]);

  const handleReorder = (orderedIds: string[]) => {
    setTaskOrder(orderedIds);
    localStorage.setItem('secureproject:taskOrder', JSON.stringify(orderedIds));
  };

  const toggleStatus = (value: string) => {
    setActiveStatuses((prev) => {
      const next = new Set(prev);
      next.has(value) ? next.delete(value) : next.add(value);
      return next;
    });
  };

  const allStatusesSelected = activeStatuses.size === ALL_STATUS_VALUES.length;

  const toggleAllStatuses = () => {
    setActiveStatuses(allStatusesSelected ? new Set() : new Set(ALL_STATUS_VALUES));
  };

  const clearFilters = () => {
    setActiveStatuses(new Set(ALL_STATUS_VALUES));
    setFilterProject('all');
    setSearchQuery('');
    setProjectSearch('');
    setFilterTeam('all');
  };

  const hasActiveFilters =
    activeStatuses.size < ALL_STATUS_VALUES.length || filterProject !== 'all' || filterTeam !== 'all';

  const activeStatusCount = ALL_STATUS_VALUES.length - activeStatuses.size;

  // ── Handlers ──────────────────────────────────────────────────────────────

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
    setDateRange({ start: startOfDay(subDays(new Date(), 7)), end: startOfDay(addDays(new Date(), 52)) });

  // ── Loading ───────────────────────────────────────────────────────────────

  if (loading || projectsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Actions */}
      <div className="flex items-center justify-end">
        <AddTaskDialog projects={projectsList} onAdd={addTask} teams={teams} />
      </div>

      {/* Summary cards */}
      {filteredTasks.length > 0 && <ScheduleSummary tasks={filteredTasks} />}

      {/* Search bar */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Buscar por tarefa ou projeto..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <span className="text-sm text-muted-foreground whitespace-nowrap">
          {filteredTasks.length} tarefa{filteredTasks.length !== 1 ? 's' : ''}
        </span>
      </div>

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
            {/* Status filter popover */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={hasActiveFilters ? 'border-primary text-primary gap-2' : 'gap-2'}
                >
                  <Filter className="h-4 w-4" />
                  Filtros
                  {activeStatusCount > 0 && (
                    <Badge className="h-4 px-1.5 text-xs ml-1">{activeStatusCount}</Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-4" align="end">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold">Filtros</p>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs gap-1 text-muted-foreground"
                      onClick={clearFilters}
                    >
                      <X className="w-3 h-3" /> Limpar
                    </Button>
                  )}
                </div>

                {/* Status de Projeto */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Status do Projeto
                    </p>
                    <button
                      onClick={toggleAllStatuses}
                      className="text-xs text-primary hover:underline"
                    >
                      {allStatusesSelected ? 'Desmarcar todos' : 'Selecionar todos'}
                    </button>
                  </div>
                  {PROJECT_STATUSES.map((s) => (
                    <div key={s.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`status-${s.value}`}
                        checked={activeStatuses.has(s.value)}
                        onCheckedChange={() => toggleStatus(s.value)}
                      />
                      <Label
                        htmlFor={`status-${s.value}`}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {s.label}
                      </Label>
                    </div>
                  ))}
                </div>

                <Separator className="my-3" />

                {/* Projeto específico — input com lista filtrada */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Projeto específico
                  </p>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Buscar projeto..."
                      value={projectSearch}
                      onChange={(e) => setProjectSearch(e.target.value)}
                      className="pl-8 pr-8 h-8 text-sm"
                    />
                    {projectSearch && (
                      <button
                        onClick={() => setProjectSearch('')}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="max-h-36 overflow-y-auto space-y-0.5">
                    <button
                      onClick={() => { setFilterProject('all'); setProjectSearch(''); }}
                      className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                        filterProject === 'all'
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      Todos os projetos
                    </button>
                    {filteredProjectOptions.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-2 py-1.5">Nenhum projeto encontrado</p>
                    ) : (
                      filteredProjectOptions.map((p) => (
                        <button
                          key={p.id}
                          onClick={() => { setFilterProject(p.id); setProjectSearch(''); }}
                          className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-2 transition-colors ${
                            filterProject === p.id
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                          <span className="truncate">{p.name}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {teams.length > 0 && (
                  <>
                    <Separator className="my-3" />
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Equipe
                      </p>
                      <div className="max-h-36 overflow-y-auto space-y-0.5">
                        <button
                          onClick={() => setFilterTeam('all')}
                          className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                            filterTeam === 'all'
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-muted-foreground'
                          }`}
                        >
                          Todas as equipes
                        </button>
                        {teams.filter((t) => t.active).map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setFilterTeam(t.id)}
                            className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                              filterTeam === t.id
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-muted'
                            }`}
                          >
                            {t.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

              </PopoverContent>
            </Popover>

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

      {/* Active filter chips */}
      {(hasActiveFilters || searchQuery) && (
        <div className="flex flex-wrap gap-2 items-center">
          {filterProject !== 'all' && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer"
              onClick={() => setFilterProject('all')}
            >
              {filterLabel} <X className="w-3 h-3" />
            </Badge>
          )}
          {ALL_STATUS_VALUES
            .filter((v) => !activeStatuses.has(v))
            .map((v) => {
              const s = PROJECT_STATUSES.find((x) => x.value === v);
              return s ? (
                <Badge
                  key={v}
                  variant="secondary"
                  className="gap-1 cursor-pointer opacity-60"
                  onClick={() => toggleStatus(v)}
                >
                  Excluindo: {s.label} <X className="w-3 h-3" />
                </Badge>
              ) : null;
            })}
          {filterTeam !== 'all' && (
            <Badge
              variant="secondary"
              className="gap-1 cursor-pointer"
              onClick={() => setFilterTeam('all')}
            >
              Equipe: {teams.find((t) => t.id === filterTeam)?.name ?? filterTeam}{' '}
              <X className="w-3 h-3" />
            </Badge>
          )}
        </div>
      )}

      {/* Gantt */}
      <div className="flex-1 min-h-[500px]">
        <GanttChart
          tasks={orderedTasks}
          onUpdateTask={handleUpdateTask}
          onUpdateMultiple={handleUpdateMultiple}
          onAddDependency={(sourceId, targetId) => addDependency(sourceId, targetId, calendarConfig)}
          onRemoveDependency={removeDependency}
          onTaskClick={handleTaskClick}
          startDate={dateRange.start}
          endDate={dateRange.end}
          calendarConfig={calendarConfig}
          onReorder={handleReorder}
        />
      </div>

      <TaskEditDialog
        task={selectedTask}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={handleSaveTask}
        onDelete={deleteTask}
        teams={teams}
      />

      <div className="fixed left-[-9999px] top-0 pointer-events-none">
        <SchedulePDFPreview
          ref={pdfRef}
          tasks={orderedTasks}
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
