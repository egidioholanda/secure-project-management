import { useMemo, useState } from "react";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useAuthContext } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DollarSign, TrendingUp, Target, Award, ArrowRight,
  Users, LayoutGrid, Package, Wrench, Filter, X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { STAGES } from "@/lib/salesStages";

// ── Constants ────────────────────────────────────────────────────────────────


// Etapas vêm de @/lib/salesStages — antes este arquivo tinha a própria cópia
// do funil, com cores que já haviam divergido do Kanban e do card.
const STAGE_CONFIG = STAGES.map((s) => ({
  key: s.key,
  matchKeys: [s.key] as string[],
  label: s.label,
  color: s.color,
}));

const TYPE_COLORS = ["#6366f1", "#3b82f6", "#f59e0b", "#f97316", "#10b981", "#ec4899", "#06b6d4"];
const ALL_TYPES = ["CFTV", "Controle de Acesso", "Alarme Perimetral", "Sistema Integrado", "Automação"];

const PERIOD_OPTIONS = [
  { value: "all",     label: "Todos os períodos" },
  { value: "month",   label: "Este mês" },
  { value: "3months", label: "Últimos 3 meses" },
  { value: "6months", label: "Últimos 6 meses" },
  { value: "year",    label: "Este ano" },
];


// ── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (value: number) => {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `R$ ${(value / 1_000).toFixed(0)}K`;
  return `R$ ${value.toFixed(0)}`;
};

const formatCurrencyFull = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

const getDateThreshold = (period: string): Date | null => {
  const now = new Date();
  if (period === "month")   return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "3months") { const d = new Date(now); d.setMonth(d.getMonth() - 3); return d; }
  if (period === "6months") { const d = new Date(now); d.setMonth(d.getMonth() - 6); return d; }
  if (period === "year")    return new Date(now.getFullYear(), 0, 1);
  return null;
};

// ── Sub-components ───────────────────────────────────────────────────────────

const KpiCard = ({
  icon: Icon,
  label,
  value,
  sub,
  accent = false,
  color = "text-primary",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  color?: string;
}) => (
  <Card className={cn("p-5 flex flex-col gap-3", accent && "bg-gradient-primary text-primary-foreground")}>
    <div className="flex items-center justify-between">
      <p className={cn("text-sm font-medium", accent ? "text-primary-foreground/80" : "text-muted-foreground")}>
        {label}
      </p>
      <div className={cn("p-2 rounded-lg", accent ? "bg-white/15" : "bg-muted")}>
        <Icon className={cn("w-4 h-4", accent ? "text-primary-foreground" : color)} />
      </div>
    </div>
    <div>
      <p className={cn("text-2xl font-bold leading-none", accent ? "text-primary-foreground" : "text-foreground")}>
        {value}
      </p>
      {sub && (
        <p className={cn("text-xs mt-1.5", accent ? "text-primary-foreground/70" : "text-muted-foreground")}>
          {sub}
        </p>
      )}
    </div>
  </Card>
);

const CurrencyTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold mb-1 text-foreground">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="text-xs">
          {p.name}: {formatCurrencyFull(p.value)}
        </p>
      ))}
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

const DashboardComercial = () => {
  const { allowedClientGroupIds } = useAuthContext();
  const { opportunities, loading } = useOpportunities(allowedClientGroupIds);

  // ── Filter state ──────────────────────────────────────────────────────────
  const [filterPeriod, setFilterPeriod]           = useState("all");
  const [filterTypes, setFilterTypes]             = useState<string[]>([]);
  const [filterResponsibles, setFilterResponsibles] = useState<string[]>([]);
  const [filterStages, setFilterStages]           = useState<string[]>([]);

  const toggleArr = <T,>(arr: T[], val: T): T[] =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  const activeFilterCount = filterTypes.length + filterResponsibles.length + filterStages.length +
    (filterPeriod !== "all" ? 1 : 0);

  const clearFilters = () => {
    setFilterPeriod("all");
    setFilterTypes([]);
    setFilterResponsibles([]);
    setFilterStages([]);
  };

  // Dynamic lists
  const responsibleOptions = useMemo(() => {
    const s = new Set(opportunities.map((o) => o.responsible).filter(Boolean));
    return Array.from(s).sort();
  }, [opportunities]);

  // ── Filtered opportunities ────────────────────────────────────────────────
  const filteredOpps = useMemo(() => {
    const threshold = getDateThreshold(filterPeriod);
    return opportunities.filter((o) => {
      if (threshold && new Date(o.createdAtIso) < threshold) return false;
      if (filterTypes.length > 0) {
        const ptypes = o.type ? o.type.split(",").map((t) => t.trim()).filter(Boolean) : [];
        if (!ptypes.some((t) => filterTypes.includes(t))) return false;
      }
      if (filterResponsibles.length > 0 && !filterResponsibles.includes(o.responsible)) return false;
      if (filterStages.length > 0) {
        const stage = STAGE_CONFIG.find((s) => s.matchKeys.includes(o.status));
        if (!stage || !filterStages.includes(stage.key)) return false;
      }
      return true;
    });
  }, [opportunities, filterPeriod, filterTypes, filterResponsibles, filterStages]);

  // ── Core aggregations ─────────────────────────────────────────────────────

  const won    = useMemo(() => filteredOpps.filter((o) => o.status === "ganha"), [filteredOpps]);
  const lost   = useMemo(() => filteredOpps.filter((o) => o.status === "perdida"), [filteredOpps]);
  const active = useMemo(() => filteredOpps.filter((o) => o.status !== "ganha" && o.status !== "perdida"), [filteredOpps]);

  const pipelineValue        = useMemo(() => active.reduce((s, o) => s + o.value, 0), [active]);
  const wonValue             = useMemo(() => won.reduce((s, o) => s + o.value, 0), [won]);
  const wonProductValue      = useMemo(() => won.reduce((s, o) => s + (o.productValue ?? 0), 0), [won]);
  const wonServiceValue      = useMemo(() => won.reduce((s, o) => s + (o.serviceValue ?? 0), 0), [won]);
  const pipelineProductValue = useMemo(() => active.reduce((s, o) => s + (o.productValue ?? 0), 0), [active]);
  const pipelineServiceValue = useMemo(() => active.reduce((s, o) => s + (o.serviceValue ?? 0), 0), [active]);
  // Só negócios DECIDIDOS entram na conta: dividir pelo total (incluindo os
  // em aberto) fazia a taxa piorar a cada oportunidade nova cadastrada.
  const decidedCount         = won.length + lost.length;
  const conversionRate       = decidedCount > 0 ? Math.round((won.length / decidedCount) * 100) : 0;
  const ticketMedio          = won.length > 0 ? wonValue / won.length : 0;

  // ── Funnel by value ───────────────────────────────────────────────────────
  const funnelData = useMemo(() =>
    STAGE_CONFIG.map((stage) => {
      const opps  = filteredOpps.filter((o) => stage.matchKeys.includes(o.status));
      const value = opps.reduce((s, o) => s + o.value, 0);
      return { ...stage, count: opps.length, value };
    }),
    [filteredOpps]
  );

  const maxFunnelValue = Math.max(...funnelData.map((s) => s.value), 1);

  // ── By responsible ────────────────────────────────────────────────────────
  const responsibleData = useMemo(() => {
    const map: Record<string, number> = {};
    active.forEach((o) => {
      const r = o.responsible || "Sem responsável";
      map[r] = (map[r] || 0) + o.value;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name: name.split(" ")[0], value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [active]);

  // ── By type (pie) ─────────────────────────────────────────────────────────
  const typeData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredOpps.forEach((o) => {
      const ptypes = o.type ? o.type.split(",").map((t) => t.trim()).filter(Boolean) : ["Outros"];
      ptypes.forEach((t) => { map[t] = (map[t] || 0) + 1; });
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [filteredOpps]);

  // ── Top opportunities by value ────────────────────────────────────────────
  const topOpps = useMemo(() =>
    [...filteredOpps]
      .sort((a, b) => b.value - a.value)
      .slice(0, 8),
    [filteredOpps]
  );

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-52 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  const empty = filteredOpps.length === 0;
  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === filterPeriod)?.label;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Comercial</h1>
          <p className="text-sm text-muted-foreground capitalize">
            {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <Button asChild variant="outline" size="sm" className="gap-2 self-start sm:self-auto">
          <Link to="/oportunidades">
            <LayoutGrid className="w-4 h-4" />
            Ver Kanban
            <ArrowRight className="w-3 h-3" />
          </Link>
        </Button>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Period select */}
        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
          <SelectTrigger className="h-9 w-48 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((p) => (
              <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* More filters popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 h-9">
              <Filter className="w-3.5 h-3.5" />
              Filtros
              {(filterTypes.length + filterResponsibles.length + filterStages.length) > 0 && (
                <Badge className="ml-1 h-4 px-1.5 text-xs">
                  {filterTypes.length + filterResponsibles.length + filterStages.length}
                </Badge>
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

            {/* Etapa */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Etapa</p>
              {STAGE_CONFIG.map((s) => (
                <div key={s.key} className="flex items-center gap-2">
                  <Checkbox
                    id={`stage-${s.key}`}
                    checked={filterStages.includes(s.key)}
                    onCheckedChange={() => setFilterStages((p) => toggleArr(p, s.key))}
                  />
                  <Label htmlFor={`stage-${s.key}`} className="text-sm font-normal cursor-pointer flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    {s.label}
                  </Label>
                </div>
              ))}
            </div>

            <Separator className="my-3" />

            {/* Tipo */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Tipo de Projeto</p>
              {ALL_TYPES.map((t) => (
                <div key={t} className="flex items-center gap-2">
                  <Checkbox
                    id={`type-${t}`}
                    checked={filterTypes.includes(t)}
                    onCheckedChange={() => setFilterTypes((p) => toggleArr(p, t))}
                  />
                  <Label htmlFor={`type-${t}`} className="text-sm font-normal cursor-pointer">{t}</Label>
                </div>
              ))}
            </div>

            {responsibleOptions.length > 0 && (
              <>
                <Separator className="my-3" />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Responsável</p>
                  {responsibleOptions.map((r) => (
                    <div key={r} className="flex items-center gap-2">
                      <Checkbox
                        id={`resp-${r}`}
                        checked={filterResponsibles.includes(r)}
                        onCheckedChange={() => setFilterResponsibles((p) => toggleArr(p, r))}
                      />
                      <Label htmlFor={`resp-${r}`} className="text-sm font-normal cursor-pointer">{r}</Label>
                    </div>
                  ))}
                </div>
              </>
            )}
          </PopoverContent>
        </Popover>

        {/* Active chips */}
        {filterPeriod !== "all" && (
          <Badge variant="secondary" className="gap-1 cursor-pointer h-9 px-3" onClick={() => setFilterPeriod("all")}>
            {periodLabel} <X className="w-3 h-3" />
          </Badge>
        )}
        {filterStages.map((k) => {
          const s = STAGE_CONFIG.find((x) => x.key === k);
          return s ? (
            <Badge key={k} variant="secondary" className="gap-1 cursor-pointer h-9 px-3" onClick={() => setFilterStages((p) => p.filter((x) => x !== k))}>
              {s.label} <X className="w-3 h-3" />
            </Badge>
          ) : null;
        })}
        {filterTypes.map((t) => (
          <Badge key={t} variant="secondary" className="gap-1 cursor-pointer h-9 px-3" onClick={() => setFilterTypes((p) => p.filter((x) => x !== t))}>
            {t} <X className="w-3 h-3" />
          </Badge>
        ))}
        {filterResponsibles.map((r) => (
          <Badge key={r} variant="secondary" className="gap-1 cursor-pointer h-9 px-3" onClick={() => setFilterResponsibles((p) => p.filter((x) => x !== r))}>
            {r.split(" ")[0]} <X className="w-3 h-3" />
          </Badge>
        ))}
      </div>

      {/* ── KPI strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={DollarSign}
          label="Pipeline Ativo"
          value={formatCurrency(pipelineValue)}
          sub={`${active.length} oportunidade${active.length !== 1 ? "s" : ""} em andamento`}
          accent
        />
        <KpiCard
          icon={Award}
          label="Oportunidades Ganhas"
          value={formatCurrency(wonValue)}
          sub={`${won.length} oportunidade${won.length !== 1 ? "s" : ""} ganha${won.length !== 1 ? "s" : ""}`}
          color="text-emerald-500"
        />
        <KpiCard
          icon={TrendingUp}
          label="Taxa de Conversão"
          value={`${conversionRate}%`}
          sub={`${won.length} de ${filteredOpps.length} oportunidades`}
          color="text-amber-500"
        />
        <KpiCard
          icon={Target}
          label="Ticket Médio"
          value={formatCurrency(ticketMedio)}
          sub={won.length > 0 ? `Baseado em ${won.length} fechamento${won.length !== 1 ? "s" : ""}` : "Sem fechamentos ainda"}
          color="text-violet-500"
        />
      </div>

      {/* ── Receita por Componente ── */}
      {(pipelineProductValue + pipelineServiceValue + wonProductValue + wonServiceValue) > 0 && (
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <Package className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Receita por Componente</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left pb-3 text-xs font-medium text-muted-foreground uppercase tracking-wide w-32"></th>
                  <th className="text-right pb-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Em Venda (pipeline)</th>
                  <th className="text-right pb-3 text-xs font-medium text-muted-foreground uppercase tracking-wide pl-8">Ganho</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                <tr>
                  <td className="py-3 flex items-center gap-2 font-medium"><Package className="w-3.5 h-3.5 text-violet-500" />Produto</td>
                  <td className="py-3 text-right tabular-nums text-violet-500 font-semibold">{pipelineProductValue > 0 ? formatCurrencyFull(pipelineProductValue) : "—"}</td>
                  <td className="py-3 text-right tabular-nums text-violet-600 font-bold pl-8">{wonProductValue > 0 ? formatCurrencyFull(wonProductValue) : "—"}</td>
                </tr>
                <tr>
                  <td className="py-3 flex items-center gap-2 font-medium"><Wrench className="w-3.5 h-3.5 text-blue-500" />Serviço</td>
                  <td className="py-3 text-right tabular-nums text-blue-500 font-semibold">{pipelineServiceValue > 0 ? formatCurrencyFull(pipelineServiceValue) : "—"}</td>
                  <td className="py-3 text-right tabular-nums text-blue-600 font-bold pl-8">{wonServiceValue > 0 ? formatCurrencyFull(wonServiceValue) : "—"}</td>
                </tr>
                <tr className="border-t-2 border-border">
                  <td className="py-3 flex items-center gap-2 font-bold text-foreground"><DollarSign className="w-3.5 h-3.5 text-muted-foreground" />Total</td>
                  <td className="py-3 text-right tabular-nums font-bold text-foreground">
                    {(pipelineProductValue + pipelineServiceValue) > 0 ? formatCurrencyFull(pipelineProductValue + pipelineServiceValue) : "—"}
                  </td>
                  <td className="py-3 text-right tabular-nums font-bold text-success pl-8">
                    {(wonProductValue + wonServiceValue) > 0 ? formatCurrencyFull(wonProductValue + wonServiceValue) : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ── Funil por Valor (hero chart) ── */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">Funil por Valor</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Distribuição do valor total por etapa do pipeline</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total (ativo + ganho)</p>
            <p className="text-lg font-bold">{formatCurrency(pipelineValue + wonValue)}</p>
          </div>
        </div>

        {empty ? (
          <div className="h-40 flex items-center justify-center text-muted-foreground">
            Nenhuma oportunidade encontrada
          </div>
        ) : (
          <div className="space-y-4">
            {funnelData.map((stage) => {
              const barPct = maxFunnelValue > 0
                ? Math.max((stage.value / maxFunnelValue) * 100, stage.count > 0 ? 4 : 0)
                : 0;
              return (
                <div key={stage.key} className="flex items-center gap-4">
                  <div className="w-40 shrink-0 flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground leading-tight">{stage.label}</span>
                  </div>
                  <div className="w-8 shrink-0 text-center text-xs font-bold rounded-full py-0.5"
                    style={{ backgroundColor: `${stage.color}20`, color: stage.color }}>
                    {stage.count}
                  </div>
                  <div className="flex-1 h-9 bg-muted/50 rounded-lg overflow-hidden">
                    {stage.count === 0 ? (
                      <div className="h-full flex items-center px-3">
                        <span className="text-xs text-muted-foreground">Sem oportunidades</span>
                      </div>
                    ) : (
                      <div className="h-full rounded-lg flex items-center px-3 transition-all duration-700"
                        style={{ width: `${barPct}%`, backgroundColor: stage.color }}>
                        <span className="text-white text-xs font-semibold truncate">{formatCurrency(stage.value)}</span>
                      </div>
                    )}
                  </div>
                  <div className="w-20 shrink-0 text-right">
                    <p className="text-sm font-bold" style={{ color: stage.count > 0 ? stage.color : undefined }}>
                      {stage.count > 0 ? formatCurrency(stage.value) : "—"}
                    </p>
                  </div>
                </div>
              );
            })}
            <div className="flex gap-2 pt-2 justify-center flex-wrap">
              {funnelData.slice(0, -1).map((stage, i) => {
                const next = funnelData[i + 1];
                const rate = stage.count > 0 ? Math.round((next.count / stage.count) * 100) : 0;
                return (
                  <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/60 rounded-full px-3 py-1">
                    <span>{stage.label}</span>
                    <ArrowRight className="w-3 h-3" />
                    <span>{next.label}</span>
                    <span className="font-bold text-foreground">{rate}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>

      {/* ── Por Responsável + Por Tipo ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Pipeline por Responsável</h2>
          </div>
          {responsibleData.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-muted-foreground">Nenhuma oportunidade ativa</div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={responsibleData} layout="vertical" margin={{ left: 0, right: 24, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} width={60} />
                <Tooltip content={<CurrencyTooltip />} />
                <Bar dataKey="value" name="Pipeline" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Distribuição por Tipo</h2>
          </div>
          {typeData.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-muted-foreground">Nenhuma oportunidade encontrada</div>
          ) : (
            <ResponsiveContainer width="100%" height={236}>
              <PieChart>
                <Pie data={typeData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value" strokeWidth={0}>
                  {typeData.map((_, i) => <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => [`${v} oportunidade${v !== 1 ? "s" : ""}`, ""]} />
                <Legend iconType="circle" iconSize={8} formatter={(value) => <span className="text-sm text-foreground">{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* ── Maiores Oportunidades ── */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold">Maiores Oportunidades</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Ordenadas por valor decrescente</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="gap-1 text-primary">
            <Link to="/oportunidades">Ver todas <ArrowRight className="w-3 h-3" /></Link>
          </Button>
        </div>

        {empty ? (
          <div className="py-12 text-center text-muted-foreground">Nenhuma oportunidade encontrada</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left pb-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Oportunidade</th>
                  <th className="text-left pb-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">Cliente</th>
                  <th className="text-left pb-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Responsável</th>
                  <th className="text-left pb-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden xl:table-cell">Tipo</th>
                  <th className="text-right pb-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Valor</th>
                  <th className="text-left pb-3 text-xs font-medium text-muted-foreground uppercase tracking-wide pl-4">Etapa</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {topOpps.map((opp, i) => {
                  const stage = STAGE_CONFIG.find((s) => s.matchKeys.includes(opp.status));
                  return (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3.5 pr-4">
                        <p className="font-medium leading-tight">{opp.title}</p>
                        <p className="text-xs text-muted-foreground md:hidden mt-0.5">{opp.client}</p>
                      </td>
                      <td className="py-3.5 pr-4 text-muted-foreground hidden md:table-cell">{opp.client}</td>
                      <td className="py-3.5 pr-4 text-muted-foreground hidden lg:table-cell">{opp.responsible || "—"}</td>
                      <td className="py-3.5 pr-4 hidden xl:table-cell">
                        <div className="flex gap-1 flex-wrap">
                          {opp.type
                            ? opp.type.split(",").map((t) => t.trim()).filter(Boolean).map((t) => (
                                <span key={t} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full whitespace-nowrap">{t}</span>
                              ))
                            : <span className="text-muted-foreground">—</span>}
                        </div>
                      </td>
                      <td className="py-3.5 pr-4 text-right">
                        <p className="font-bold tabular-nums">{opp.value ? formatCurrencyFull(opp.value) : "—"}</p>
                        {(opp.productValue || opp.serviceValue) && (
                          <div className="flex gap-2 justify-end mt-0.5">
                            {opp.productValue && <span className="text-xs text-violet-500 tabular-nums">P: {formatCurrency((opp.productValue ?? 0))}</span>}
                            {opp.serviceValue && <span className="text-xs text-blue-500 tabular-nums">S: {formatCurrency((opp.serviceValue ?? 0))}</span>}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 pl-4">
                        {stage && (
                          <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                            style={{ backgroundColor: `${stage.color}18`, color: stage.color }}>
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                            {stage.label}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

    </div>
  );
};

export default DashboardComercial;
