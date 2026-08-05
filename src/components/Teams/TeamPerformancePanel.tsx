import { useEffect, useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  addMonths,
  subMonths,
  eachDayOfInterval,
  isSameMonth,
  differenceInCalendarDays,
  format,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FolderKanban,
  Users,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Filter,
  X,
} from "lucide-react";
import { MetricCard } from "@/components/Dashboard/MetricCard";
import { cn } from "@/lib/utils";
import type { Team } from "@/types/teams";
import type { Project } from "@/types/project";

export interface PerformanceTask {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  team_id: string | null;
  projectId: string;
  projectName: string;
  progress: number;
  blockedByClient?: boolean;
}

export interface ContractClientRef {
  id: string;
  name: string;
  clientGroupId: string | null;
}

export interface ClientGroupRef {
  id: string;
  name: string;
}

/** A specific calendar month, or "all" to aggregate across the entire active period. */
export type MonthSelection = Date | "all";

interface TeamPerformancePanelProps {
  teams: Team[];
  tasks: PerformanceTask[];
  projects: Project[];
  contractClients?: ContractClientRef[];
  clientGroups?: ClientGroupRef[];
  showChart?: boolean;
  showInsight?: boolean;
  /** Controlled month selection — pass together with onSelectedMonthChange to sync with a parent page. */
  selectedMonth?: MonthSelection;
  onSelectedMonthChange?: (month: MonthSelection) => void;
}

type TaskTipo = "projeto" | "contrato";

const TYPE_OPTIONS: { key: TaskTipo; label: string }[] = [
  { key: "projeto", label: "Projetos" },
  { key: "contrato", label: "Cliente Contrato" },
];

const TEAM_PALETTE = ["#3b82f6", "#a855f7", "#0ea5e9", "#f59e0b", "#10b981", "#ec4899", "#6366f1", "#84cc16"];

const SelectAllToggle = ({ allSelected, onToggle }: { allSelected: boolean; onToggle: () => void }) => (
  <button
    type="button"
    onClick={onToggle}
    className="text-xs font-medium text-primary hover:underline underline-offset-2"
  >
    {allSelected ? "Limpar" : "Selecionar todos"}
  </button>
);

interface BarTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { label: string } }>;
}

const BarTooltip = ({ active, payload }: BarTooltipProps) => {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    return (
      <div className="bg-card border border-border rounded-lg shadow-card px-3 py-2 text-sm">
        <p className="font-semibold">{payload[0].payload.label}</p>
        <p className="text-muted-foreground">{value} obra{value !== 1 ? "s" : ""} atendida{value !== 1 ? "s" : ""}</p>
      </div>
    );
  }
  return null;
};

interface DrillState {
  title: string;
  subtitle: string;
  node: React.ReactNode;
}

interface ObraGroup {
  projectId: string;
  nome: string;
  cliente?: string;
  dias: number;
  done: boolean;
  late: boolean;
  stopped: boolean;
  periodoStart: Date;
  periodoEnd: Date;
}

type ObraStatus = "concluida" | "atrasada" | "andamento" | "parada";

const OBRA_STATUS_OPTIONS: { key: ObraStatus; label: string }[] = [
  { key: "concluida", label: "Concluída" },
  { key: "atrasada", label: "Atrasada" },
  { key: "andamento", label: "Em Andamento" },
  { key: "parada", label: "Parada (Cliente)" },
];

// Excluída por padrão do filtro (e das contagens de "Obras no mês") — reative em Filtros se necessário
const DEFAULT_OBRA_STATUSES: ObraStatus[] = ["concluida", "atrasada", "andamento"];

const obraStatusOf = (done: boolean, late: boolean, stopped: boolean): ObraStatus =>
  done ? "concluida" : stopped ? "parada" : late ? "atrasada" : "andamento";

const fmtRange = (start: Date, end: Date) =>
  differenceInCalendarDays(end, start) === 0
    ? format(start, "dd/MM")
    : `${format(start, "dd/MM")} – ${format(end, "dd/MM")}`;

const isBusinessDay = (d: Date) => {
  const day = d.getDay();
  return day !== 0 && day !== 6;
};

const countBusinessDays = (start: Date, end: Date) => {
  if (end < start) return 0;
  return eachDayOfInterval({ start, end }).filter(isBusinessDay).length;
};

export const TeamPerformancePanel = ({
  teams,
  tasks,
  projects,
  contractClients = [],
  clientGroups = [],
  showChart = true,
  showInsight = true,
  selectedMonth: controlledMonth,
  onSelectedMonthChange,
}: TeamPerformancePanelProps) => {
  const activeTeams = useMemo(() => teams.filter((t) => t.active), [teams]);

  const teamColor = useMemo(() => {
    const map: Record<string, string> = {};
    activeTeams.forEach((t, i) => { map[t.id] = TEAM_PALETTE[i % TEAM_PALETTE.length]; });
    return map;
  }, [activeTeams]);

  const projectById = useMemo(() => {
    const map: Record<string, Project> = {};
    projects.forEach((p) => { map[p.id] = p; });
    return map;
  }, [projects]);

  const contractClientById = useMemo(() => {
    const map: Record<string, ContractClientRef> = {};
    contractClients.forEach((c) => { map[c.id] = c; });
    return map;
  }, [contractClients]);

  const taskMeta = (projectId: string): { tipo: TaskTipo; clientGroupId: string | null; cliente?: string } => {
    const project = projectById[projectId];
    if (project) return { tipo: "projeto", clientGroupId: project.clientGroupId ?? null, cliente: project.client };
    const contract = contractClientById[projectId];
    if (contract) return { tipo: "contrato", clientGroupId: contract.clientGroupId };
    return { tipo: "projeto", clientGroupId: null };
  };

  // ── Filters ──────────────────────────────────────────────────────────────
  const [activeTypes, setActiveTypes] = useState<Set<TaskTipo>>(new Set(["projeto", "contrato"]));
  const [activeClientGroups, setActiveClientGroups] = useState<Set<string>>(new Set());
  const [activeTeamIds, setActiveTeamIds] = useState<Set<string>>(new Set());
  const [activeObraStatuses, setActiveObraStatuses] = useState<Set<ObraStatus>>(
    new Set(DEFAULT_OBRA_STATUSES)
  );

  useEffect(() => {
    setActiveClientGroups(new Set(clientGroups.map((g) => g.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientGroups.map((g) => g.id).join(",")]);

  useEffect(() => {
    setActiveTeamIds(new Set(activeTeams.map((t) => t.id)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTeams.map((t) => t.id).join(",")]);

  const toggleType = (t: TaskTipo) => {
    setActiveTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  };

  const toggleClientGroup = (id: string) => {
    setActiveClientGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleTeamFilter = (id: string) => {
    setActiveTeamIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleObraStatus = (status: ObraStatus) => {
    setActiveObraStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(status)) next.delete(status); else next.add(status);
      return next;
    });
  };

  const allTypesSelected = activeTypes.size === TYPE_OPTIONS.length;
  const toggleAllTypes = () =>
    setActiveTypes(allTypesSelected ? new Set() : new Set(TYPE_OPTIONS.map((o) => o.key)));

  const allClientGroupsSelected = clientGroups.length > 0 && activeClientGroups.size === clientGroups.length;
  const toggleAllClientGroups = () =>
    setActiveClientGroups(allClientGroupsSelected ? new Set() : new Set(clientGroups.map((g) => g.id)));

  const allTeamsSelected = activeTeams.length > 0 && activeTeamIds.size === activeTeams.length;
  const toggleAllTeams = () =>
    setActiveTeamIds(allTeamsSelected ? new Set() : new Set(activeTeams.map((t) => t.id)));

  const allObraStatusesSelected = activeObraStatuses.size === OBRA_STATUS_OPTIONS.length;
  const toggleAllObraStatuses = () =>
    setActiveObraStatuses(allObraStatusesSelected ? new Set() : new Set(OBRA_STATUS_OPTIONS.map((o) => o.key)));

  const activeFilterCount =
    (allTeamsSelected ? 0 : 1) + (allTypesSelected ? 0 : 1) +
    (allClientGroupsSelected || clientGroups.length === 0 ? 0 : 1) +
    (allObraStatusesSelected ? 0 : 1);

  const clearAllFilters = () => {
    setActiveTeamIds(new Set(activeTeams.map((t) => t.id)));
    setActiveTypes(new Set(TYPE_OPTIONS.map((o) => o.key)));
    setActiveClientGroups(new Set(clientGroups.map((g) => g.id)));
    setActiveObraStatuses(new Set(DEFAULT_OBRA_STATUSES));
  };

  const visibleTeams = useMemo(
    () => activeTeams.filter((t) => activeTeamIds.has(t.id)),
    [activeTeams, activeTeamIds]
  );

  const filteredTasks = useMemo(
    () => tasks.filter((t) => {
      const meta = taskMeta(t.projectId);
      if (!activeTypes.has(meta.tipo)) return false;
      if (clientGroups.length > 0 && meta.clientGroupId && !activeClientGroups.has(meta.clientGroupId)) return false;
      if (t.team_id && !activeTeamIds.has(t.team_id)) return false;
      return true;
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tasks, activeTypes, activeClientGroups, activeTeamIds, clientGroups, projectById, contractClientById]
  );

  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const currentMonthStart = useMemo(() => startOfMonth(today), [today]);
  const [internalSelection, setInternalSelection] = useState<MonthSelection>(currentMonthStart);
  const selection = controlledMonth ?? internalSelection;
  const setSelection = (updater: MonthSelection | ((prev: MonthSelection) => MonthSelection)) => {
    const next = typeof updater === "function" ? (updater as (prev: MonthSelection) => MonthSelection)(selection) : updater;
    if (onSelectedMonthChange) onSelectedMonthChange(next);
    else setInternalSelection(next);
  };
  // Reference point for the chart window and prev/next stepping — always a concrete month
  const pointerMonth = selection === "all" ? currentMonthStart : selection;
  const [drill, setDrill] = useState<DrillState | null>(null);

  const firstActiveMonth = useMemo(() => {
    if (filteredTasks.length === 0) return null;
    return filteredTasks.reduce<Date>((min, t) => {
      const m = startOfMonth(t.startDate);
      return m < min ? m : min;
    }, startOfMonth(filteredTasks[0].startDate));
  }, [filteredTasks]);

  // Keep the selected month within the range that actually has data for the current filters
  useEffect(() => {
    if (selection !== "all" && firstActiveMonth && selection < firstActiveMonth) setSelection(firstActiveMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstActiveMonth, selection]);

  const capitalize = (s: string) => (s.length ? s[0].toUpperCase() + s.slice(1) : s);

  const monthOptions = useMemo(() => {
    const start = firstActiveMonth ?? currentMonthStart;
    const months: Date[] = [];
    let cursor = currentMonthStart;
    while (cursor >= start) {
      months.push(cursor);
      cursor = subMonths(cursor, 1);
    }
    return months;
  }, [firstActiveMonth, currentMonthStart]);

  const rangeLabel = selection === "all" ? "todos os meses" : format(selection, "MMMM/yyyy", { locale: ptBR });

  const activeRange = useMemo(() => {
    if (selection === "all") {
      const start = firstActiveMonth ?? pointerMonth;
      return { start: startOfMonth(start), end: endOfMonth(currentMonthStart) };
    }
    return { start: startOfMonth(selection), end: endOfMonth(selection) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, firstActiveMonth, currentMonthStart]);

  const monthRange = (d: Date) => ({ start: startOfMonth(d), end: endOfMonth(d) });

  const effectiveEndDate = (t: PerformanceTask) => {
    const end = new Date(t.endDate); end.setHours(0, 0, 0, 0);
    return t.progress < 100 && end < today ? today : end;
  };

  const isWorkingOnDay = (teamId: string, day: Date) =>
    filteredTasks.some((t) => {
      if (t.team_id !== teamId) return false;
      const start = new Date(t.startDate); start.setHours(0, 0, 0, 0);
      return start <= day && effectiveEndDate(t) >= day;
    });

  interface DateRange { start: Date; end: Date }

  const elapsedDaysInRange = ({ start, end }: DateRange): Date[] => {
    const cappedEnd = end > today ? today : end;
    if (cappedEnd < start) return [];
    return eachDayOfInterval({ start, end: cappedEnd }).filter(isBusinessDay);
  };

  const teamStatsForRange = (teamId: string, range: DateRange) => {
    const days = elapsedDaysInRange(range);
    let worked = 0;
    const idleRanges: { start: Date; end: Date }[] = [];
    let rangeStart: Date | null = null;
    days.forEach((day, idx) => {
      if (isWorkingOnDay(teamId, day)) {
        worked++;
        if (rangeStart) { idleRanges.push({ start: rangeStart, end: days[idx - 1] }); rangeStart = null; }
      } else if (!rangeStart) {
        rangeStart = day;
      }
      if (idx === days.length - 1 && rangeStart) idleRanges.push({ start: rangeStart, end: day });
    });
    return { worked, idle: days.length - worked, elapsed: days.length, idleRanges };
  };

  const teamObrasForRange = (teamId: string, range: DateRange): ObraGroup[] => {
    const mStart = range.start;
    const mEnd = range.end;
    const elapsedEnd = mEnd > today ? today : mEnd;
    const grouped: Record<string, ObraGroup> = {};
    filteredTasks.forEach((t) => {
      if (t.team_id !== teamId) return;
      const s = new Date(t.startDate); s.setHours(0, 0, 0, 0);
      const realEnd = new Date(t.endDate); realEnd.setHours(0, 0, 0, 0);
      const e = effectiveEndDate(t);
      if (e < mStart || s > mEnd) return;
      const overlapStart = s > mStart ? s : mStart;
      const overlapEnd = realEnd < elapsedEnd ? realEnd : elapsedEnd;
      const dias = overlapEnd >= overlapStart ? countBusinessDays(overlapStart, overlapEnd) : 0;
      const key = t.projectId;
      if (!grouped[key]) {
        grouped[key] = {
          projectId: t.projectId,
          nome: t.projectName,
          cliente: taskMeta(t.projectId).cliente,
          dias: 0,
          done: true,
          late: false,
          stopped: false,
          periodoStart: overlapStart,
          periodoEnd: overlapEnd,
        };
      }
      const g = grouped[key];
      g.dias += Math.max(dias, 0);
      // "Concluída" só se a tarefa terminou DENTRO deste período — uma tarefa 100%
      // cujo término real cai num mês seguinte ainda está "em andamento" neste mês.
      if (t.progress < 100 || realEnd > mEnd) g.done = false;
      if (t.progress < 100 && realEnd < today) g.late = true;
      if (t.blockedByClient) g.stopped = true;
      if (overlapStart < g.periodoStart) g.periodoStart = overlapStart;
      if (overlapEnd > g.periodoEnd) g.periodoEnd = overlapEnd;
    });
    return Object.values(grouped).sort((a, b) => b.dias - a.dias);
  };

  // Cross-team aggregate — status (concluída/atrasada/andamento/parada) is evaluated across ALL
  // contributing teams, then the obra-status filter is applied here (the source of truth).
  const obrasAcrossTeamsForRange = (range: DateRange) => {
    const map: Record<string, { projectId: string; nome: string; cliente?: string; done: boolean; late: boolean; stopped: boolean; teams: { name: string; color: string; dias: number }[] }> = {};
    visibleTeams.forEach((team) => {
      teamObrasForRange(team.id, range).forEach((o) => {
        if (!map[o.projectId]) {
          map[o.projectId] = { projectId: o.projectId, nome: o.nome, cliente: o.cliente, done: true, late: false, stopped: false, teams: [] };
        }
        map[o.projectId].teams.push({ name: team.name, color: teamColor[team.id], dias: o.dias });
        if (!o.done) map[o.projectId].done = false;
        if (o.late) map[o.projectId].late = true;
        if (o.stopped) map[o.projectId].stopped = true;
      });
    });
    return Object.values(map).filter((o) => activeObraStatuses.has(obraStatusOf(o.done, o.late, o.stopped)));
  };

  // Per-team obra list restricted to projects whose CROSS-team status passes the active filter
  const teamObrasForRangeFiltered = (teamId: string, range: DateRange): ObraGroup[] => {
    const passingIds = new Set(obrasAcrossTeamsForRange(range).map((o) => o.projectId));
    return teamObrasForRange(teamId, range).filter((o) => passingIds.has(o.projectId));
  };

  // Trailing 6-month window for the chart — always anchored to a concrete month (pointerMonth),
  // independent of whether the KPIs below are showing a single month or "todos os meses".
  const monthsWindow = useMemo(() => {
    if (!firstActiveMonth) return [pointerMonth];
    const trailingStart = subMonths(pointerMonth, 5);
    const windowStart = trailingStart < firstActiveMonth ? firstActiveMonth : trailingStart;
    const months: Date[] = [];
    let cursor = windowStart;
    while (cursor <= pointerMonth) {
      months.push(cursor);
      cursor = addMonths(cursor, 1);
    }
    return months;
  }, [pointerMonth, firstActiveMonth]);

  const chartData = useMemo(
    () => monthsWindow.map((m) => ({
      label: format(m, "MMM/yy", { locale: ptBR }),
      value: obrasAcrossTeamsForRange(monthRange(m)).length,
      isSelected: selection !== "all" && isSameMonth(m, selection),
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [monthsWindow, filteredTasks, visibleTeams, selection, activeObraStatuses]
  );

  const monthAgg = useMemo(() => {
    let workedTotal = 0, idleTotal = 0, idleRatioSum = 0;
    visibleTeams.forEach((team) => {
      const s = teamStatsForRange(team.id, activeRange);
      workedTotal += s.worked;
      idleTotal += s.idle;
      idleRatioSum += s.elapsed > 0 ? s.idle / s.elapsed : 0;
    });
    return {
      obrasCount: obrasAcrossTeamsForRange(activeRange).length,
      workedTotal,
      idleTotal,
      idleRatePct: visibleTeams.length > 0 ? Math.round((idleRatioSum / visibleTeams.length) * 100) : 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleTeams, filteredTasks, activeRange, activeObraStatuses]);

  const insight = useMemo(() => {
    if (visibleTeams.length === 0 || !firstActiveMonth) return null;
    const insightWindow = monthsWindow.length > 0 ? monthsWindow : [pointerMonth];
    const totals = visibleTeams.map((team) => {
      let idleSum = 0, elapsedSum = 0;
      insightWindow.forEach((m) => {
        const s = teamStatsForRange(team.id, monthRange(m));
        idleSum += s.idle;
        elapsedSum += s.elapsed;
      });
      return { team, idleSum, pct: elapsedSum > 0 ? Math.round((idleSum / elapsedSum) * 100) : 0 };
    }).sort((a, b) => b.pct - a.pct);
    const worst = totals[0];
    if (!worst || worst.idleSum === 0) return null;
    return worst;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleTeams, filteredTasks, monthsWindow, firstActiveMonth]);

  const statusBadge = (done: boolean, stopped = false) => (
    <Badge
      variant="outline"
      className={
        done
          ? "text-success border-success/30 bg-success/10"
          : stopped
            ? "text-warning border-warning/30 bg-warning/10"
            : "text-primary border-primary/30 bg-primary/10"
      }
    >
      {done ? "Concluída" : stopped ? "Parada (Cliente)" : "Em andamento"}
    </Badge>
  );

  const teamChip = (name: string, color: string, dias: number) => (
    <span key={name} className="inline-flex items-center gap-1.5 text-xs font-medium bg-muted px-2 py-1 rounded-full">
      <span className="w-2 h-2 rounded-full" style={{ background: color }} />
      {name} · {dias}d
    </span>
  );

  const openObrasMesDrawer = () => {
    const obras = obrasAcrossTeamsForRange(activeRange);
    const node = obras.length === 0 ? (
      <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma obra com atividade no período.</p>
    ) : (
      <div className="space-y-3">
        {obras.map((o) => (
          <div key={o.projectId} className="rounded-lg border border-border p-3 flex flex-col gap-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-sm leading-tight">{o.nome}</p>
                {o.cliente && <p className="text-xs text-muted-foreground">{o.cliente}</p>}
              </div>
              {statusBadge(o.done, o.stopped)}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {o.teams.map((t) => teamChip(t.name, t.color, t.dias))}
            </div>
          </div>
        ))}
      </div>
    );
    setDrill({
      title: `Obras — ${rangeLabel}`,
      subtitle: `${obras.length} projeto${obras.length !== 1 ? "s" : ""} com atividade no período`,
      node,
    });
  };

  const openDiasMesDrawer = () => {
    const node = (
      <div className="space-y-3">
        {visibleTeams.map((team) => {
          const s = teamStatsForRange(team.id, activeRange);
          const pct = s.elapsed > 0 ? Math.round((s.worked / s.elapsed) * 100) : 0;
          return (
            <div key={team.id} className="rounded-lg border border-border p-3 flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 font-medium text-sm">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: teamColor[team.id] }} />
                  Equipe {team.name}
                </span>
                <Badge className="bg-success/10 text-success border-success/20" variant="outline">{s.worked} dias</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                de {s.elapsed} dias úteis no período · <span className="font-semibold text-foreground">{pct}%</span> de ocupação
              </p>
            </div>
          );
        })}
      </div>
    );
    setDrill({
      title: `Dias trabalhados — ${rangeLabel}`,
      subtitle: "distribuição por equipe",
      node,
    });
  };

  const openTeamObrasDrawer = (team: Team) => {
    const obras = teamObrasForRangeFiltered(team.id, activeRange);
    const node = obras.length === 0 ? (
      <p className="text-sm text-muted-foreground py-8 text-center">Nenhuma obra atribuída a esta equipe no período.</p>
    ) : (
      <div className="space-y-3">
        {obras.map((o) => (
          <div key={o.projectId} className="rounded-lg border border-border p-3 flex flex-col gap-1.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-medium text-sm leading-tight">{o.nome}</p>
                {o.cliente && <p className="text-xs text-muted-foreground">{o.cliente}</p>}
              </div>
              {statusBadge(o.done, o.stopped)}
            </div>
            <p className="text-xs text-muted-foreground">
              {fmtRange(o.periodoStart, o.periodoEnd)} · <span className="font-semibold text-foreground">{o.dias} dias</span>
            </p>
          </div>
        ))}
      </div>
    );
    setDrill({
      title: `Equipe ${team.name} · obras`,
      subtitle: `${obras.length} obra(s) em ${rangeLabel}`,
      node,
    });
  };

  const openTeamIdleDrawer = (team: Team) => {
    const stats = teamStatsForRange(team.id, activeRange);
    const node = stats.idleRanges.length === 0 ? (
      <p className="text-sm text-muted-foreground py-8 text-center">Sem dias ociosos no período — equipe 100% ocupada.</p>
    ) : (
      <div className="space-y-3">
        {stats.idleRanges.map((r, i) => {
          const dias = countBusinessDays(r.start, r.end);
          return (
            <div key={i} className="rounded-lg border border-border p-3 flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{fmtRange(r.start, r.end)}</span>
              <Badge className="bg-warning/10 text-warning border-warning/20" variant="outline">
                {dias} dia{dias !== 1 ? "s" : ""} sem tarefa
              </Badge>
            </div>
          );
        })}
      </div>
    );
    setDrill({
      title: `Equipe ${team.name} · dias ociosos`,
      subtitle: `${stats.idle} dia(s) sem tarefa atribuída em ${rangeLabel}`,
      node,
    });
  };

  const canGoNext = selection !== "all" && selection < currentMonthStart;
  const canGoPrev = selection !== "all" && (!firstActiveMonth || selection > firstActiveMonth);
  const hasData = firstActiveMonth !== null;

  return (
    <div className="space-y-6">
      {/* Month navigation */}
      <div className="flex items-center justify-end flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            disabled={!canGoPrev}
            onClick={() => setSelection((prev) => subMonths(prev === "all" ? currentMonthStart : prev, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Select
            value={selection === "all" ? "all" : format(selection, "yyyy-MM")}
            onValueChange={(v) => {
              if (v === "all") { setSelection("all"); return; }
              const found = monthOptions.find((m) => format(m, "yyyy-MM") === v);
              if (found) setSelection(found);
            }}
          >
            <SelectTrigger className="w-[190px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os meses</SelectItem>
              {monthOptions.map((m) => (
                <SelectItem key={format(m, "yyyy-MM")} value={format(m, "yyyy-MM")}>
                  {capitalize(format(m, "MMMM 'de' yyyy", { locale: ptBR }))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9"
            disabled={!canGoNext}
            onClick={() => setSelection((prev) => addMonths(prev === "all" ? currentMonthStart : prev, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
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
          <PopoverContent className="w-72 p-4 max-h-96 overflow-y-auto" align="start">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">Filtros</p>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs gap-1 text-muted-foreground" onClick={clearAllFilters}>
                  <X className="w-3 h-3" /> Limpar todos
                </Button>
              )}
            </div>

            {activeTeams.length > 1 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Equipe</p>
                  <SelectAllToggle allSelected={allTeamsSelected} onToggle={toggleAllTeams} />
                </div>
                {activeTeams.map((team) => (
                  <div key={team.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`team-${team.id}`}
                      checked={activeTeamIds.has(team.id)}
                      onCheckedChange={() => toggleTeamFilter(team.id)}
                    />
                    <Label htmlFor={`team-${team.id}`} className="text-sm font-normal cursor-pointer flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: teamColor[team.id] }} />
                      {team.name}
                    </Label>
                  </div>
                ))}
              </div>
            )}

            {activeTeams.length > 1 && (contractClients.length > 0 || clientGroups.length > 0) && (
              <Separator className="my-3" />
            )}

            {contractClients.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo</p>
                  <SelectAllToggle allSelected={allTypesSelected} onToggle={toggleAllTypes} />
                </div>
                {TYPE_OPTIONS.map((opt) => (
                  <div key={opt.key} className="flex items-center gap-2">
                    <Checkbox
                      id={`type-${opt.key}`}
                      checked={activeTypes.has(opt.key)}
                      onCheckedChange={() => toggleType(opt.key)}
                    />
                    <Label htmlFor={`type-${opt.key}`} className="text-sm font-normal cursor-pointer">{opt.label}</Label>
                  </div>
                ))}
              </div>
            )}

            {contractClients.length > 0 && clientGroups.length > 0 && <Separator className="my-3" />}

            {clientGroups.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Grupo de Clientes</p>
                  <SelectAllToggle allSelected={allClientGroupsSelected} onToggle={toggleAllClientGroups} />
                </div>
                {clientGroups.map((g) => (
                  <div key={g.id} className="flex items-center gap-2">
                    <Checkbox
                      id={`group-${g.id}`}
                      checked={activeClientGroups.has(g.id)}
                      onCheckedChange={() => toggleClientGroup(g.id)}
                    />
                    <Label htmlFor={`group-${g.id}`} className="text-sm font-normal cursor-pointer">{g.name}</Label>
                  </div>
                ))}
              </div>
            )}

            {clientGroups.length > 0 && <Separator className="my-3" />}

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status da Obra</p>
                <SelectAllToggle allSelected={allObraStatusesSelected} onToggle={toggleAllObraStatuses} />
              </div>
              {OBRA_STATUS_OPTIONS.map((opt) => (
                <div key={opt.key} className="flex items-center gap-2">
                  <Checkbox
                    id={`obra-status-${opt.key}`}
                    checked={activeObraStatuses.has(opt.key)}
                    onCheckedChange={() => toggleObraStatus(opt.key)}
                  />
                  <Label htmlFor={`obra-status-${opt.key}`} className="text-sm font-normal cursor-pointer">{opt.label}</Label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <h2 className="text-lg font-semibold flex items-center gap-2">
        <TrendingUp className="w-4 h-4 text-primary" />
        Desempenho das equipes
      </h2>

      {activeTeams.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">Nenhuma equipe ativa cadastrada.</div>
      ) : visibleTeams.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground text-sm">Nenhuma equipe selecionada no filtro.</div>
      ) : !hasData ? (
        <div className="py-12 text-center text-muted-foreground text-sm">Nenhuma atividade encontrada para os filtros selecionados.</div>
      ) : (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Obras no mês"
              value={monthAgg.obrasCount}
              icon={FolderKanban}
              onClick={openObrasMesDrawer}
            />
            <MetricCard
              title="Equipes ativas"
              value={visibleTeams.length}
              icon={Users}
            />
            <MetricCard
              title="Dias trabalhados"
              value={monthAgg.workedTotal}
              icon={Clock}
              onClick={openDiasMesDrawer}
            />
            <MetricCard
              title="Ociosidade média"
              value={`${monthAgg.idleRatePct}%`}
              icon={AlertTriangle}
              change={`${monthAgg.idleTotal} dias ociosos`}
              changeType={monthAgg.idleRatePct > 30 ? "negative" : "neutral"}
            />
          </div>

          {/* Insight */}
          {showInsight && insight && (
            <Card className="p-4 border-warning/30 bg-warning/5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-warning/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <AlertTriangle className="w-4 h-4 text-warning" />
                </div>
                <div className="flex-1 text-sm">
                  <span className="font-semibold">Equipe {insight.team.name}</span> acumulou {insight.idleSum} dias ociosos
                  no período exibido ({insight.pct}% do tempo) — a maior taxa entre as equipes. Considere realocação
                  ou reforço na captação de obras para essa equipe.
                </div>
              </div>
            </Card>
          )}

          {/* Chart */}
          {showChart && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold">Obras atendidas por mês</h3>
                <span className="text-xs text-muted-foreground">clique em uma barra para selecionar o mês</span>
              </div>
              <ResponsiveContainer width="100%" height={224}>
                <BarChart data={chartData} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: "hsl(var(--muted))", opacity: 0.4 }} />
                  <Bar
                    dataKey="value"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={44}
                    cursor="pointer"
                    onClick={(_, index) => setSelection(monthsWindow[index])}
                  >
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={d.isSelected ? "hsl(var(--primary))" : "hsl(var(--muted))"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}

          {/* Team table */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold">
                Equipes — {rangeLabel}
              </h3>
              <span className="text-xs text-muted-foreground">clique nos números para ver o detalhe</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
                    <th className="text-left pb-3 font-medium">Equipe</th>
                    <th className="text-right pb-3 font-medium">Obras atendidas</th>
                    <th className="text-right pb-3 font-medium">Dias trabalhados</th>
                    <th className="text-right pb-3 font-medium">Dias ociosos</th>
                    <th className="text-right pb-3 font-medium w-40">Ocupação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {visibleTeams.map((team) => {
                    const stats = teamStatsForRange(team.id, activeRange);
                    const obrasCount = teamObrasForRangeFiltered(team.id, activeRange).length;
                    const occPct = stats.elapsed > 0 ? Math.round((stats.worked / stats.elapsed) * 100) : 0;
                    return (
                      <tr key={team.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3.5 pr-4">
                          <div className="flex items-center gap-2 font-medium">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: teamColor[team.id] }} />
                            Equipe {team.name}
                          </div>
                        </td>
                        <td
                          className="py-3.5 text-right font-mono font-semibold tabular-nums cursor-pointer underline decoration-dotted decoration-muted-foreground/50 underline-offset-4 hover:text-primary"
                          onClick={() => openTeamObrasDrawer(team)}
                        >
                          {obrasCount}
                        </td>
                        <td
                          className="py-3.5 text-right font-mono font-semibold tabular-nums cursor-pointer text-success underline decoration-dotted decoration-success/40 underline-offset-4 hover:text-success/80"
                          onClick={() => openTeamObrasDrawer(team)}
                        >
                          {stats.worked}
                        </td>
                        <td
                          className="py-3.5 text-right font-mono font-semibold tabular-nums cursor-pointer text-warning underline decoration-dotted decoration-warning/40 underline-offset-4 hover:text-warning/80"
                          onClick={() => openTeamIdleDrawer(team)}
                        >
                          {stats.idle}
                        </td>
                        <td className="py-3.5 pl-4 w-40">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2 rounded-full overflow-hidden bg-warning/20 min-w-[70px]">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${occPct}%` }} />
                            </div>
                            <span className="text-xs text-muted-foreground w-9 text-right">{occPct}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {/* Drill-down dialog */}
      <Dialog open={!!drill} onOpenChange={(open) => !open && setDrill(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{drill?.title}</DialogTitle>
            <p className="text-sm text-muted-foreground">{drill?.subtitle}</p>
          </DialogHeader>
          {drill?.node}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TeamPerformancePanel;
