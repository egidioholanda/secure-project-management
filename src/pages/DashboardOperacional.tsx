import { useMemo, useState } from "react";
import { useProjects } from "@/hooks/useProjects";
import { useScheduleTasks } from "@/hooks/useScheduleTasks";
import { MetricCard } from "@/components/Dashboard/MetricCard";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  FolderKanban, Clock, AlertTriangle, CheckCircle2,
  CalendarDays, User, TrendingUp, ArrowRight, Filter, X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const normalizeStatus = (status: string) => {
  if (["Em Andamento", "in_progress", "execution"].includes(status)) return "execution";
  if (["Planejamento", "planning"].includes(status)) return "planning";
  if (["Concluído", "completed", "concluido"].includes(status)) return "completed";
  if (["onhold", "Em Espera"].includes(status)) return "onhold";
  if (["stopped", "Parado"].includes(status)) return "stopped";
  if (["started_stopped", "Iniciado/Parado"].includes(status)) return "started_stopped";
  if (["obra_civil", "Obra Civil"].includes(status)) return "obra_civil";
  return "planning";
};

const parseDisplayDate = (dateStr: string): Date | null => {
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  return null;
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  execution:       { label: "Em Execução",     color: "#3b82f6" },
  planning:        { label: "Planejamento",    color: "#f59e0b" },
  completed:       { label: "Concluído",       color: "#10b981" },
  onhold:          { label: "Em Espera",       color: "#6366f1" },
  stopped:         { label: "Parado",          color: "#ef4444" },
  started_stopped: { label: "Iniciado/Parado", color: "#a855f7" },
  obra_civil:      { label: "Obra Civil",      color: "#92400e" },
};

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-card px-3 py-2 text-sm">
        <p className="font-semibold">{payload[0].payload.name}</p>
        <p className="text-muted-foreground">{payload[0].value} obra{payload[0].value !== 1 ? "s" : ""}</p>
      </div>
    );
  }
  return null;
};

const ManagerTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-card px-3 py-2 text-sm">
        <p className="font-semibold">{payload[0].payload.name}</p>
        <p className="text-muted-foreground">{payload[0].value} obra{payload[0].value !== 1 ? "s" : ""} em andamento</p>
      </div>
    );
  }
  return null;
};

const DashboardOperacional = () => {
  const { projects, loading: loadingProjects } = useProjects();
  const { tasks, loading: loadingTasks } = useScheduleTasks();

  // ── Filter state ──────────────────────────────────────────────────────────
  const [filterStatuses, setFilterStatuses]   = useState<string[]>([]);
  const [filterManagers, setFilterManagers]   = useState<string[]>([]);
  const [lateOnly, setLateOnly]               = useState(false);
  const [nearDeadline, setNearDeadline]       = useState(false);

  const toggleArr = <T,>(arr: T[], val: T): T[] =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  const activeFilterCount =
    filterStatuses.length + filterManagers.length +
    (lateOnly ? 1 : 0) + (nearDeadline ? 1 : 0);

  const clearFilters = () => {
    setFilterStatuses([]);
    setFilterManagers([]);
    setLateOnly(false);
    setNearDeadline(false);
  };

  const isLoading = loadingProjects || loadingTasks;

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const projectsWithMeta = useMemo(() => {
    return projects.map((project) => {
      const projectTasks = tasks.filter((t) => t.projectId === project.id);
      const avgProgress =
        projectTasks.length > 0
          ? Math.round(projectTasks.reduce((sum, t) => sum + t.progress, 0) / projectTasks.length)
          : 0;
      const endDate = parseDisplayDate(project.endDate);
      const normalized = normalizeStatus(project.status);
      const hasLateTasks = projectTasks.some((t) => t.endDate < today && t.progress < 100);
      const isLate = normalized !== "completed" && ((endDate !== null && endDate < today) || hasLateTasks);
      const daysLate = isLate && endDate ? Math.ceil((today.getTime() - endDate.getTime()) / 86400000) : 0;
      const daysToEnd = endDate !== null ? Math.ceil((endDate.getTime() - today.getTime()) / 86400000) : null;
      const assigneeCounts: Record<string, number> = {};
      projectTasks.forEach((t) => {
        if (t.assignee) assigneeCounts[t.assignee] = (assigneeCounts[t.assignee] || 0) + 1;
      });
      const topAssignee = Object.entries(assigneeCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
      const displayManager = topAssignee || project.manager || "";
      return { ...project, avgProgress, endDate, normalized, isLate, daysLate, daysToEnd, displayManager };
    });
  }, [projects, tasks, today]);

  // Dynamic manager list
  const managerOptions = useMemo(() => {
    const s = new Set(projectsWithMeta.map((p) => p.displayManager).filter(Boolean));
    return Array.from(s).sort();
  }, [projectsWithMeta]);

  // ── Apply filters ─────────────────────────────────────────────────────────
  const filteredProjects = useMemo(() => {
    return projectsWithMeta.filter((p) => {
      if (lateOnly && !p.isLate) return false;
      if (nearDeadline && (p.daysToEnd === null || p.daysToEnd < 0 || p.daysToEnd > 30)) return false;
      if (filterStatuses.length > 0 && !filterStatuses.includes(p.normalized)) return false;
      if (filterManagers.length > 0 && !filterManagers.includes(p.displayManager)) return false;
      return true;
    });
  }, [projectsWithMeta, lateOnly, nearDeadline, filterStatuses, filterManagers]);

  const execProjects      = filteredProjects.filter((p) => p.normalized === "execution");
  const planProjects      = filteredProjects.filter((p) => p.normalized === "planning");
  const onholdProjects    = filteredProjects.filter((p) => p.normalized === "onhold");
  const stoppedProjects        = filteredProjects.filter((p) => p.normalized === "stopped");
  const startedStoppedProjects = filteredProjects.filter((p) => p.normalized === "started_stopped");
  const obraCivilProjects = filteredProjects.filter((p) => p.normalized === "obra_civil");
  const completedProjects = filteredProjects.filter((p) => p.normalized === "completed");
  const lateProjects      = execProjects.filter((p) => p.isLate);

  const avgProgressOngoing =
    execProjects.length > 0
      ? Math.round(execProjects.reduce((sum, p) => sum + p.avgProgress, 0) / execProjects.length)
      : 0;

  const statusData = [
    { name: "Em Execução",  value: execProjects.length,      color: "#3b82f6" },
    { name: "Planejamento", value: planProjects.length,      color: "#f59e0b" },
    { name: "Concluídos",   value: completedProjects.length, color: "#10b981" },
    { name: "Em Espera",    value: onholdProjects.length,    color: "#6366f1" },
    { name: "Parados",          value: stoppedProjects.length,        color: "#ef4444" },
    { name: "Iniciado/Parado",  value: startedStoppedProjects.length, color: "#a855f7" },
    { name: "Obra Civil",   value: obraCivilProjects.length, color: "#92400e" },
  ].filter((d) => d.value > 0);

  const managerData = useMemo(() => {
    const map: Record<string, number> = {};
    execProjects.forEach((p) => {
      const key = p.displayManager || "Sem responsável";
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [execProjects]);

  const upcomingDeadlines = useMemo(() => {
    return filteredProjects
      .filter((p) => p.normalized !== "completed" && p.daysToEnd !== null && p.daysToEnd >= 0 && p.daysToEnd <= 30)
      .sort((a, b) => (a.daysToEnd ?? 0) - (b.daysToEnd ?? 0));
  }, [filteredProjects]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div><Skeleton className="h-9 w-72 mb-2" /><Skeleton className="h-5 w-48" /></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Operacional</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap gap-2 items-center">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 h-9">
              <Filter className="w-3.5 h-3.5" />
              Filtros
              {activeFilterCount > 0 && (
                <Badge className="ml-1 h-4 px-1.5 text-xs">{activeFilterCount}</Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4" align="start">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">Filtros</p>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1 text-muted-foreground" onClick={clearFilters}>
                  <X className="w-3 h-3" /> Limpar todos
                </Button>
              )}
            </div>

            {/* Situação */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Situação</p>
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <div key={key} className="flex items-center gap-2">
                  <Checkbox
                    id={`status-${key}`}
                    checked={filterStatuses.includes(key)}
                    onCheckedChange={() => setFilterStatuses((p) => toggleArr(p, key))}
                  />
                  <Label htmlFor={`status-${key}`} className="text-sm font-normal cursor-pointer flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: cfg.color }} />
                    {cfg.label}
                  </Label>
                </div>
              ))}
            </div>

            <Separator className="my-3" />

            {/* Prazo */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Prazo</p>
              <div className="flex items-center gap-2">
                <Checkbox id="late-only" checked={lateOnly} onCheckedChange={(v) => setLateOnly(!!v)} />
                <Label htmlFor="late-only" className="text-sm font-normal cursor-pointer">Somente atrasados</Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox id="near-deadline" checked={nearDeadline} onCheckedChange={(v) => setNearDeadline(!!v)} />
                <Label htmlFor="near-deadline" className="text-sm font-normal cursor-pointer">Vencendo em 30 dias</Label>
              </div>
            </div>

            {managerOptions.length > 0 && (
              <>
                <Separator className="my-3" />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Responsável</p>
                  {managerOptions.map((m) => (
                    <div key={m} className="flex items-center gap-2">
                      <Checkbox
                        id={`mgr-${m}`}
                        checked={filterManagers.includes(m)}
                        onCheckedChange={() => setFilterManagers((p) => toggleArr(p, m))}
                      />
                      <Label htmlFor={`mgr-${m}`} className="text-sm font-normal cursor-pointer">{m}</Label>
                    </div>
                  ))}
                </div>
              </>
            )}
          </PopoverContent>
        </Popover>

        {/* Active chips */}
        {filterStatuses.map((s) => (
          <Badge key={s} variant="secondary" className="gap-1 cursor-pointer h-9 px-3"
            onClick={() => setFilterStatuses((p) => p.filter((x) => x !== s))}>
            {STATUS_CONFIG[s]?.label ?? s} <X className="w-3 h-3" />
          </Badge>
        ))}
        {lateOnly && (
          <Badge variant="secondary" className="gap-1 cursor-pointer h-9 px-3" onClick={() => setLateOnly(false)}>
            Atrasados <X className="w-3 h-3" />
          </Badge>
        )}
        {nearDeadline && (
          <Badge variant="secondary" className="gap-1 cursor-pointer h-9 px-3" onClick={() => setNearDeadline(false)}>
            Vencendo em 30d <X className="w-3 h-3" />
          </Badge>
        )}
        {filterManagers.map((m) => (
          <Badge key={m} variant="secondary" className="gap-1 cursor-pointer h-9 px-3"
            onClick={() => setFilterManagers((p) => p.filter((x) => x !== m))}>
            {m.split(" ")[0]} <X className="w-3 h-3" />
          </Badge>
        ))}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Em Execução" value={execProjects.length} icon={FolderKanban} gradient />
        <MetricCard title="Para Iniciar" value={planProjects.length + onholdProjects.length} icon={Clock} />
        <MetricCard
          title="Com Atraso"
          value={lateProjects.length}
          icon={AlertTriangle}
          change={lateProjects.length > 0 ? "Atenção necessária" : "Em dia"}
          changeType={lateProjects.length > 0 ? "negative" : "positive"}
        />
        <MetricCard
          title="Concluídos"
          value={completedProjects.length}
          icon={CheckCircle2}
          change={execProjects.length > 0 ? `${avgProgressOngoing}% progresso médio` : undefined}
          changeType="positive"
        />
      </div>

      {/* Alert badges for stopped / obra civil */}
      {(stoppedProjects.length > 0 || startedStoppedProjects.length > 0 || obraCivilProjects.length > 0) && (
        <div className="flex flex-wrap gap-2">
          {stoppedProjects.length > 0 && (
            <Badge className="bg-red-500/10 text-red-500 border-red-500/20 h-8 px-3 text-sm gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500" />
              {stoppedProjects.length} Parado{stoppedProjects.length !== 1 ? "s" : ""}
            </Badge>
          )}
          {startedStoppedProjects.length > 0 && (
            <Badge className="bg-purple-500/10 text-purple-500 border-purple-500/20 h-8 px-3 text-sm gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              {startedStoppedProjects.length} Iniciado/Parado
            </Badge>
          )}
          {obraCivilProjects.length > 0 && (
            <Badge className="bg-amber-700/10 text-amber-700 border-amber-700/20 h-8 px-3 text-sm gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-700" />
              {obraCivilProjects.length} Obra Civil
            </Badge>
          )}
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Distribuição por Status</h2>
            <span className="text-sm text-muted-foreground">{filteredProjects.length} total</span>
          </div>
          {statusData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-muted-foreground">Nenhum projeto encontrado</div>
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value" strokeWidth={0}>
                  {statusData.map((d, index) => <Cell key={index} fill={d.color} />)}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8} formatter={(value) => <span className="text-sm text-foreground">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Obras em Andamento por Responsável</h2>
          </div>
          {managerData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-muted-foreground">Nenhuma obra em andamento</div>
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <BarChart data={managerData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <Tooltip content={<ManagerTooltip />} />
                <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Late Projects Alert */}
      {lateProjects.length > 0 && (
        <Card className="p-6 border-destructive/30 bg-destructive/5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-destructive/15 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-destructive">Obras com Atraso</h2>
              <p className="text-xs text-muted-foreground">Requerem atenção imediata</p>
            </div>
            <Badge variant="destructive" className="ml-auto">{lateProjects.length}</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {lateProjects.map((p, i) => (
              <div key={i} className="bg-background rounded-xl p-4 border border-destructive/20 flex flex-col gap-2">
                <div>
                  <p className="font-semibold text-sm leading-tight truncate">{p.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{p.client}</p>
                </div>
                <div className="flex items-center justify-between mt-auto pt-1">
                  <span className="text-xs font-semibold text-destructive bg-destructive/10 px-2 py-0.5 rounded-full">
                    {p.daysLate} dia{p.daysLate > 1 ? "s" : ""} de atraso
                  </span>
                  {p.displayManager && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {p.displayManager.split(" ")[0]}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Ongoing Projects Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="text-lg font-semibold">Obras em Andamento</h2>
          </div>
          <Link to="/projetos" className="text-sm text-primary hover:underline flex items-center gap-1">
            Ver todos <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {execProjects.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">Nenhuma obra em andamento</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
                  <th className="text-left pb-3 font-medium">Obra</th>
                  <th className="text-left pb-3 font-medium hidden md:table-cell">Cliente</th>
                  <th className="text-left pb-3 font-medium hidden lg:table-cell">Responsável</th>
                  <th className="text-left pb-3 font-medium">Prazo</th>
                  <th className="text-left pb-3 font-medium w-44">Progresso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {execProjects.map((p, i) => (
                  <tr key={i} className="hover:bg-muted/40 transition-colors">
                    <td className="py-3.5 pr-4">
                      <p className="font-medium leading-tight">{p.name}</p>
                      <p className="text-xs text-muted-foreground md:hidden">{p.client}</p>
                    </td>
                    <td className="py-3.5 pr-4 text-muted-foreground hidden md:table-cell">{p.client}</td>
                    <td className="py-3.5 pr-4 text-muted-foreground hidden lg:table-cell">{p.displayManager || "—"}</td>
                    <td className="py-3.5 pr-4">
                      {p.endDate ? (
                        <span className={cn(
                          "text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap",
                          p.isLate ? "bg-destructive/10 text-destructive"
                          : (p.daysToEnd ?? 99) <= 7 ? "bg-warning/10 text-warning"
                          : "bg-success/10 text-success"
                        )}>
                          {p.isLate ? `${p.daysLate}d de atraso`
                            : p.daysToEnd === 0 ? "Vence hoje"
                            : `${p.daysToEnd}d restantes`}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden min-w-[80px]">
                          <div
                            className={cn("h-full rounded-full transition-all duration-500",
                              p.avgProgress >= 75 ? "bg-success"
                              : p.avgProgress >= 40 ? "bg-primary"
                              : "bg-warning"
                            )}
                            style={{ width: `${p.avgProgress}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-8 text-right">{p.avgProgress}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Obras para Iniciar */}
      {planProjects.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4 text-warning" />
            <h2 className="text-lg font-semibold">Obras para Iniciar</h2>
            <Badge variant="secondary">{planProjects.length}</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {planProjects.map((p, i) => (
              <div key={i} className="rounded-xl border border-border bg-muted/30 p-4 flex flex-col gap-1.5 hover:bg-muted/60 transition-colors">
                <p className="font-semibold text-sm leading-tight">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.client}</p>
                {p.endDate && (
                  <p className="text-xs text-warning font-medium mt-1">
                    Início previsto: {p.endDate.toLocaleDateString("pt-BR")}
                  </p>
                )}
                {p.displayManager && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3" />{p.displayManager}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Em Espera */}
      {onholdProjects.length > 0 && (
        <Card className="p-6 border-indigo-500/20 bg-indigo-500/5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-3 h-3 rounded-full bg-indigo-500" />
            <h2 className="text-lg font-semibold">Em Espera</h2>
            <Badge variant="secondary">{onholdProjects.length}</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {onholdProjects.map((p, i) => (
              <div key={i} className="rounded-xl border border-indigo-500/20 bg-background p-4 flex flex-col gap-1.5">
                <p className="font-semibold text-sm leading-tight">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.client}</p>
                {p.displayManager && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3" />{p.displayManager}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Obras Paradas */}
      {stoppedProjects.length > 0 && (
        <Card className="p-6 border-red-500/20 bg-red-500/5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <h2 className="text-lg font-semibold">Obras Paradas</h2>
            <Badge variant="secondary">{stoppedProjects.length}</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {stoppedProjects.map((p, i) => (
              <div key={i} className="rounded-xl border border-red-500/20 bg-background p-4 flex flex-col gap-1.5">
                <p className="font-semibold text-sm leading-tight">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.client}</p>
                <span className="text-xs font-medium text-red-500 mt-1">
                  {STATUS_CONFIG[p.normalized]?.label ?? p.normalized}
                </span>
                {p.displayManager && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3" />{p.displayManager}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Iniciado/Parado */}
      {startedStoppedProjects.length > 0 && (
        <Card className="p-6 border-purple-500/20 bg-purple-500/5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-3 h-3 rounded-full bg-purple-500" />
            <h2 className="text-lg font-semibold">Iniciado/Parado</h2>
            <Badge variant="secondary">{startedStoppedProjects.length}</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {startedStoppedProjects.map((p, i) => (
              <div key={i} className="rounded-xl border border-purple-500/20 bg-background p-4 flex flex-col gap-1.5">
                <p className="font-semibold text-sm leading-tight">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.client}</p>
                {p.displayManager && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3" />{p.displayManager}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Obra Civil */}
      {obraCivilProjects.length > 0 && (
        <Card className="p-6 border-amber-700/20 bg-amber-700/5">
          <div className="flex items-center gap-2 mb-4">
            <span className="w-3 h-3 rounded-full bg-amber-700" />
            <h2 className="text-lg font-semibold">Obra Civil</h2>
            <Badge variant="secondary">{obraCivilProjects.length}</Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {obraCivilProjects.map((p, i) => (
              <div key={i} className="rounded-xl border border-amber-700/20 bg-background p-4 flex flex-col gap-1.5">
                <p className="font-semibold text-sm leading-tight">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.client}</p>
                {p.displayManager && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="w-3 h-3" />{p.displayManager}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Upcoming Deadlines */}
      {upcomingDeadlines.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold">Vencimentos nos Próximos 30 Dias</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {upcomingDeadlines.map((p, i) => (
              <div key={i} className={cn(
                "flex-shrink-0 rounded-xl p-4 w-52 border",
                (p.daysToEnd ?? 99) <= 7 ? "bg-warning/5 border-warning/30" : "bg-muted/30 border-border"
              )}>
                <p className="font-semibold text-sm truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground truncate mb-2">{p.client}</p>
                <div className={cn("text-xs font-bold", (p.daysToEnd ?? 99) <= 7 ? "text-warning" : "text-success")}>
                  {p.daysToEnd === 0 ? "Vence hoje!" : `${p.daysToEnd} dia${p.daysToEnd !== 1 ? "s" : ""} restantes`}
                </div>
                <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${p.avgProgress}%` }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{p.avgProgress}% concluído</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default DashboardOperacional;
