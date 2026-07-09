import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { addDays, subDays, startOfDay, startOfMonth, endOfMonth, addMonths, subMonths, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Filter, Download, Loader2, Search, X, CalendarIcon } from 'lucide-react';
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
import { Calendar } from '@/components/ui/calendar';
import { toast } from 'sonner';
import { useScheduleTasks } from '@/hooks/useScheduleTasks';
import { useProjects } from '@/hooks/useProjects';
import { useCompanySettings } from '@/hooks/useCompanySettings';
import { useCalendarConfig } from '@/hooks/useCalendarConfig';
import { useTeams } from '@/hooks/useTeams';
import { useClientGroups } from '@/hooks/useClientGroups';
import { useAuthContext } from '@/contexts/AuthContext';
import { exportScheduleToPDF } from '@/utils/exportSchedulePDF';
import { AIAssistant } from '@/components/AIAssistant';

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
  const { tasks, loading, addTask, updateTask, updateMultipleTasks, addDependency, removeDependency, deleteTask, refetch: refetchTasks } =
    useScheduleTasks();
  const { allowedClientIds, allowedClientGroupIds } = useAuthContext();
  const { projects: dbProjects, loading: projectsLoading } = useProjects(allowedClientIds, allowedClientGroupIds);
  const { settings: companySettings } = useCompanySettings();
  const { config: calendarConfig, updateConfig: updateCalendarConfig } = useCalendarConfig();
  const { teams } = useTeams();
  const { groups: clientGroups } = useClientGroups();
  const pdfRef = useRef<HTMLDivElement>(null);

  const [exporting, setExporting]         = useState(false);
  const [selectedTask, setSelectedTask]   = useState<Task | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [filterProjects, setFilterProjects] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery]       = useState('');
  const [activeStatuses, setActiveStatuses] = useState<Set<string>>(new Set(ALL_STATUS_VALUES));
  const [projectSearch, setProjectSearch]   = useState('');
  const [filterTeam, setFilterTeam]         = useState<string>('all');
  const [searchParams, setSearchParams] = useSearchParams();
  const [filterDateStart, setFilterDateStart]       = useState<Date | null>(() => {
    const d = searchParams.get('date');
    if (!d) return null;
    const parsed = new Date(d + 'T00:00:00');
    return isNaN(parsed.getTime()) ? null : parsed;
  });
  const [filterDateEnd, setFilterDateEnd]           = useState<Date | null>(() => {
    const d = searchParams.get('date');
    if (!d) return null;
    const parsed = new Date(d + 'T00:00:00');
    return isNaN(parsed.getTime()) ? null : parsed;
  });
  const [filterClientGroup, setFilterClientGroup]   = useState<string>('all');
  const [taskOrder, setTaskOrder]           = useState<string[]>([]);
  const [dateRange, setDateRange] = useState(() => {
    const d = searchParams.get('date');
    if (d) {
      const parsed = new Date(d + 'T00:00:00');
      if (!isNaN(parsed.getTime())) {
        return { start: startOfDay(subDays(parsed, 30)), end: startOfDay(addDays(parsed, 60)) };
      }
    }
    return { start: startOfDay(subDays(new Date(), 60)), end: startOfDay(addDays(new Date(), 90)) };
  });

  // Clear the ?date= param from URL after applying it on first render
  useEffect(() => {
    if (searchParams.has('date')) {
      setSearchParams({}, { replace: true });
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    // Only used as tiebreaker for same-date tasks; clear any stale full-order snapshots
    const saved = localStorage.getItem('secureproject:taskOrder');
    if (saved) { try { setTaskOrder(JSON.parse(saved)); } catch {} }
  }, []);

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

  // Set of project IDs allowed by the client group filter
  const allowedProjectIds = useMemo(
    () => new Set(dbProjects.map((p) => p.id)),
    [dbProjects]
  );

  const projectClientGroupMap = useMemo(
    () => new Map(dbProjects.map((p) => [p.id, p.clientGroupId ?? null])),
    [dbProjects]
  );

  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Restrict to projects the user has access to (via client groups)
    if (allowedClientIds !== null) {
      result = result.filter((t) => allowedProjectIds.has(t.projectId));
    }

    // Filter by selected project
    if (filterProjects.size > 0) {
      result = result.filter((t) => filterProjects.has(t.projectId));
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

    // Filter by client group
    if (filterClientGroup !== 'all') {
      result = result.filter(
        (t) => projectClientGroupMap.get(t.projectId) === filterClientGroup
      );
    }

    // Filter by date range — show tasks that overlap with the selected period
    if (filterDateStart || filterDateEnd) {
      result = result.filter((t) => {
        const afterStart = !filterDateStart || t.endDate >= filterDateStart;
        const beforeEnd  = !filterDateEnd   || t.startDate <= filterDateEnd;
        return afterStart && beforeEnd;
      });
    }

    return result;
  }, [tasks, filterProjects, activeStatuses, projectStatusMap, searchQuery, filterTeam, filterClientGroup, filterDateStart, filterDateEnd, allowedClientIds, allowedProjectIds, projectClientGroupMap]);

  const orderedTasks = useMemo(() => {
    return [...filteredTasks].sort((a, b) => {
      const startDiff = a.startDate.getTime() - b.startDate.getTime();
      if (startDiff !== 0) return startDiff;
      const endDiff = a.endDate.getTime() - b.endDate.getTime();
      if (endDiff !== 0) return endDiff;
      // Same dates: preserve drag-and-drop order as tiebreaker
      if (taskOrder.length > 0) {
        const orderMap = new Map(taskOrder.map((id, i) => [id, i]));
        const ia = orderMap.has(a.id) ? orderMap.get(a.id)! : Infinity;
        const ib = orderMap.has(b.id) ? orderMap.get(b.id)! : Infinity;
        return ia - ib;
      }
      return 0;
    });
  }, [filteredTasks, taskOrder]);

  const visibleProjectCount = useMemo(
    () => new Set(filteredTasks.map((t) => t.projectId)).size,
    [filteredTasks]
  );
  const totalProjectCount = dbProjects.length;

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
    setFilterProjects(new Set());
    setSearchQuery('');
    setProjectSearch('');
    setFilterTeam('all');
    setFilterDateStart(null);
    setFilterDateEnd(null);
    setFilterClientGroup('all');
  };

  const hasActiveFilters =
    activeStatuses.size < ALL_STATUS_VALUES.length ||
    filterProjects.size > 0 ||
    filterTeam !== 'all' ||
    filterClientGroup !== 'all' ||
    filterDateStart !== null ||
    filterDateEnd !== null;

  const toggleFilterProject = (id: string) => {
    setFilterProjects((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const applyMonthPreset = (date: Date) => {
    setFilterDateStart(startOfMonth(date));
    setFilterDateEnd(endOfMonth(date));
  };

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
    if (filterProjects.size === 0) return 'Todos os projetos';
    if (filterProjects.size === 1) {
      const id = [...filterProjects][0];
      return projectsList.find((p) => p.id === id)?.name || 'Todos os projetos';
    }
    return `${filterProjects.size} projetos`;
  }, [filterProjects, projectsList]);

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
    setDateRange({ start: startOfDay(subDays(new Date(), 60)), end: startOfDay(addDays(new Date(), 90)) });

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
        <div className="flex items-center gap-3 whitespace-nowrap">
          <span className="text-sm text-muted-foreground">
            {filteredTasks.length} tarefa{filteredTasks.length !== 1 ? 's' : ''}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className={`text-sm font-medium ${visibleProjectCount < totalProjectCount ? 'text-warning' : 'text-success'}`}>
            {visibleProjectCount}/{totalProjectCount} projeto{totalProjectCount !== 1 ? 's' : ''}
          </span>
        </div>
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
              <PopoverContent className="w-72 p-0 flex flex-col overflow-hidden" style={{ maxHeight: 'min(600px, 80vh)' }} align="end">
                {/* Sticky header */}
                <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b bg-popover">
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
                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto p-4 space-y-0 min-h-0">

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

                {/* Projetos — multi-seleção */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Projetos
                    </p>
                    {filterProjects.size > 0 && (
                      <button
                        onClick={() => { setFilterProjects(new Set()); setProjectSearch(''); }}
                        className="text-xs text-primary hover:underline"
                      >
                        Limpar ({filterProjects.size})
                      </button>
                    )}
                  </div>
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
                  <div className="space-y-0.5">
                    {filteredProjectOptions.length === 0 ? (
                      <p className="text-xs text-muted-foreground px-2 py-1.5">Nenhum projeto encontrado</p>
                    ) : (
                      filteredProjectOptions.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center gap-2 px-1 py-1 rounded hover:bg-muted cursor-pointer"
                          onClick={() => toggleFilterProject(p.id)}
                        >
                          <Checkbox
                            checked={filterProjects.has(p.id)}
                            onCheckedChange={() => toggleFilterProject(p.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                          <span className="text-sm truncate flex-1">{p.name}</span>
                        </div>
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

                {/* Client group filter */}
                {clientGroups.length > 0 && (
                  <>
                    <Separator className="my-3" />
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Grupo de Clientes
                      </p>
                      <div className="max-h-36 overflow-y-auto space-y-0.5">
                        <button
                          onClick={() => setFilterClientGroup('all')}
                          className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                            filterClientGroup === 'all'
                              ? 'bg-primary text-primary-foreground'
                              : 'hover:bg-muted text-muted-foreground'
                          }`}
                        >
                          Todos os grupos
                        </button>
                        {clientGroups.map((g) => (
                          <button
                            key={g.id}
                            onClick={() => setFilterClientGroup(g.id)}
                            className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                              filterClientGroup === g.id
                                ? 'bg-primary text-primary-foreground'
                                : 'hover:bg-muted'
                            }`}
                          >
                            {g.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Date range filter */}
                <Separator className="my-3" />
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Período
                    </p>
                    {(filterDateStart || filterDateEnd) && (
                      <button
                        onClick={() => { setFilterDateStart(null); setFilterDateEnd(null); }}
                        className="text-xs text-primary hover:underline"
                      >
                        Limpar
                      </button>
                    )}
                  </div>

                  {/* Month quick presets */}
                  <div className="flex flex-wrap gap-1">
                    {[-1, 0, 1, 2].map((offset) => {
                      const d = addMonths(new Date(), offset);
                      const label = format(d, "MMM/yy", { locale: ptBR });
                      const isActive =
                        filterDateStart?.getTime() === startOfMonth(d).getTime() &&
                        filterDateEnd?.getTime() === endOfMonth(d).getTime();
                      return (
                        <button
                          key={offset}
                          onClick={() => isActive
                            ? (setFilterDateStart(null), setFilterDateEnd(null))
                            : applyMonthPreset(d)
                          }
                          className={`px-2 py-1 rounded text-xs border transition-colors capitalize ${
                            isActive
                              ? 'bg-primary text-primary-foreground border-primary'
                              : 'border-border hover:bg-muted text-muted-foreground'
                          }`}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom range pickers */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">De</p>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full h-8 px-2 text-xs justify-start font-normal">
                            <CalendarIcon className="h-3 w-3 mr-1 shrink-0" />
                            {filterDateStart ? format(filterDateStart, "dd/MM/yy") : 'Início'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={filterDateStart ?? undefined}
                            onSelect={(d) => setFilterDateStart(d ?? null)}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Até</p>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="w-full h-8 px-2 text-xs justify-start font-normal">
                            <CalendarIcon className="h-3 w-3 mr-1 shrink-0" />
                            {filterDateEnd ? format(filterDateEnd, "dd/MM/yy") : 'Fim'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={filterDateEnd ?? undefined}
                            onSelect={(d) => setFilterDateEnd(d ?? null)}
                            initialFocus
                            className="pointer-events-auto"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>

                </div> {/* end scrollable body */}
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
          {filterProjects.size > 0 && (
            filterProjects.size === 1 ? (
              <Badge
                variant="secondary"
                className="gap-1 cursor-pointer"
                onClick={() => setFilterProjects(new Set())}
              >
                {filterLabel} <X className="w-3 h-3" />
              </Badge>
            ) : (
              [...filterProjects].map((id) => {
                const proj = projectsList.find((p) => p.id === id);
                return proj ? (
                  <Badge
                    key={id}
                    variant="secondary"
                    className="gap-1 cursor-pointer"
                    onClick={() => toggleFilterProject(id)}
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 inline-block" style={{ backgroundColor: proj.color }} />
                    {proj.name} <X className="w-3 h-3" />
                  </Badge>
                ) : null;
              })
            )
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

      <AIAssistant
        context={{ tasks, projects: projectsList, teams }}
        onMutation={refetchTasks}
      />
    </div>
  );
};

export default Schedules;
