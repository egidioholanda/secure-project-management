import { useMemo } from "react";
import { useOpportunities } from "@/hooks/useOpportunities";
import { MetricCard } from "@/components/Dashboard/MetricCard";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  AreaChart, Area,
} from "recharts";
import { Target, DollarSign, TrendingUp, Percent, Award, ArrowRight, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

const STAGE_LABELS: Record<string, string> = {
  prospeccao: "Prospecção",
  qualificacao: "Qualificação",
  proposta: "Proposta",
  negociacao: "Negociação",
  ganha: "Ganha",
};

const STAGE_ORDER = ["prospeccao", "qualificacao", "proposta", "negociacao", "ganha"];

const STAGE_COLORS = ["#8b5cf6", "#3b82f6", "#f59e0b", "#f97316", "#10b981"];

const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#f97316", "#ec4899", "#06b6d4"];

const MONTH_NAMES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const parseBRL = (raw: string) => {
  if (!raw) return 0;
  const cleaned = raw.replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
};

const formatCurrency = (value: number) => {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `R$ ${(value / 1_000).toFixed(0)}K`;
  return `R$ ${value.toFixed(0)}`;
};

const CurrencyTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-card px-3 py-2 text-sm">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="text-xs">
            {p.name}: {formatCurrency(p.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const CountTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg shadow-card px-3 py-2 text-sm">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((p: any, i: number) => (
          <p key={i} style={{ color: p.color }} className="text-xs">
            {p.value} oportunidade{p.value !== 1 ? "s" : ""}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const DashboardComercial = () => {
  const { opportunities, loading } = useOpportunities();

  const won = useMemo(() => opportunities.filter((o) => o.status === "ganha"), [opportunities]);
  const active = useMemo(() => opportunities.filter((o) => o.status !== "ganha"), [opportunities]);

  const pipelineValue = useMemo(
    () => active.reduce((sum, o) => sum + parseBRL(o.value), 0),
    [active]
  );
  const mrr = useMemo(
    () => active.reduce((sum, o) => sum + parseBRL(o.monthlyValue), 0),
    [active]
  );
  const conversionRate = useMemo(
    () =>
      opportunities.length > 0
        ? Math.round((won.length / opportunities.length) * 100)
        : 0,
    [won, opportunities]
  );
  const wonValue = useMemo(
    () => won.reduce((sum, o) => sum + parseBRL(o.value), 0),
    [won]
  );
  const ticketMedio = won.length > 0 ? wonValue / won.length : 0;

  // Funnel data
  const funnelData = useMemo(() =>
    STAGE_ORDER.map((stage, i) => ({
      name: STAGE_LABELS[stage],
      count: opportunities.filter((o) => o.status === stage).length,
      color: STAGE_COLORS[i],
    })),
    [opportunities]
  );
  const funnelMax = Math.max(...funnelData.map((d) => d.count), 1);

  // By responsible
  const responsibleData = useMemo(() => {
    const map: Record<string, { count: number; value: number }> = {};
    active.forEach((o) => {
      const r = o.responsible || "Sem responsável";
      if (!map[r]) map[r] = { count: 0, value: 0 };
      map[r].count++;
      map[r].value += parseBRL(o.value);
    });
    return Object.entries(map)
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [active]);

  // By type (pie)
  const typeData = useMemo(() => {
    const map: Record<string, number> = {};
    opportunities.forEach((o) => {
      const t = o.type || "Outros";
      map[t] = (map[t] || 0) + 1;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [opportunities]);

  // Monthly area chart — opportunities created per month (last 6 months)
  const monthlyData = useMemo(() => {
    const now = new Date();
    const months: { month: string; total: number; ganhas: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ month: MONTH_NAMES[d.getMonth()], total: 0, ganhas: 0 });
    }
    // Note: opportunities.createdAt is a formatted string from date-fns, not an ISO date.
    // We'll use index ordering as a best-effort since raw dates aren't available here.
    // Show count per stage overall across months.
    return months;
  }, [opportunities]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-72 mb-2" />
          <Skeleton className="h-5 w-48" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-72 rounded-xl" />
          <Skeleton className="h-72 rounded-xl" />
        </div>
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard Comercial</h1>
          <p className="text-muted-foreground mt-1">Pipeline de vendas, propostas e oportunidades</p>
        </div>
        <p className="text-sm text-muted-foreground capitalize">
          {new Date().toLocaleDateString("pt-BR", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <MetricCard title="Oportunidades Ativas" value={active.length} icon={Target} />
        <MetricCard
          title="Pipeline Total"
          value={formatCurrency(pipelineValue)}
          icon={DollarSign}
          gradient
        />
        <MetricCard title="MRR em Pipeline" value={formatCurrency(mrr)} icon={TrendingUp} />
        <MetricCard
          title="Taxa de Conversão"
          value={`${conversionRate}%`}
          icon={Percent}
          change={`${won.length} fechado${won.length !== 1 ? "s" : ""}`}
          changeType={conversionRate >= 30 ? "positive" : "neutral"}
        />
        <MetricCard
          title="Ticket Médio"
          value={formatCurrency(ticketMedio)}
          icon={Award}
          change={won.length > 0 ? `${won.length} ganhos` : "Sem fechamentos"}
          changeType={won.length > 0 ? "positive" : "neutral"}
        />
      </div>

      {/* Funnel + Type Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visual Funnel */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-5">Funil de Vendas</h2>
          {opportunities.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-muted-foreground">
              Nenhuma oportunidade cadastrada
            </div>
          ) : (
            <div className="space-y-2.5">
              {funnelData.map((stage, i) => {
                const widthPct = stage.count > 0 ? Math.max((stage.count / funnelMax) * 100, 12) : 0;
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-24 text-right font-medium">
                      {stage.name}
                    </span>
                    <div className="flex-1 h-10 bg-muted/50 rounded-lg overflow-hidden flex items-center">
                      {stage.count === 0 ? (
                        <span className="text-xs text-muted-foreground pl-3">0</span>
                      ) : (
                        <div
                          className="h-full rounded-lg flex items-center px-3 justify-between transition-all duration-700"
                          style={{ width: `${widthPct}%`, backgroundColor: stage.color }}
                        >
                          <span className="text-white text-xs font-bold">{stage.count}</span>
                        </div>
                      )}
                    </div>
                    <span
                      className="text-xs font-semibold w-12 text-right"
                      style={{ color: stage.color }}
                    >
                      {funnelMax > 0 ? Math.round((stage.count / funnelData[0].count || 1) * 100) : 0}%
                    </span>
                  </div>
                );
              })}
              <p className="text-xs text-muted-foreground mt-3 text-right">
                % relativo à prospecção
              </p>
            </div>
          )}
        </Card>

        {/* Pie by Type */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-2">Distribuição por Tipo</h2>
          {typeData.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-muted-foreground">
              Nenhuma oportunidade cadastrada
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={248}>
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={58}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {typeData.map((_, index) => (
                    <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number, name: string) => [
                    `${v} oportunidade${v !== 1 ? "s" : ""}`,
                    name,
                  ]}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => (
                    <span className="text-sm text-foreground">{value}</span>
                  )}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Pipeline by Responsible */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-5">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Pipeline por Responsável</h2>
        </div>
        {responsibleData.length === 0 ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground">
            Nenhuma oportunidade ativa
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={responsibleData} margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={(v) => formatCurrency(v)}
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                axisLine={false}
                tickLine={false}
                width={72}
              />
              <Tooltip content={<CurrencyTooltip />} />
              <Bar
                dataKey="value"
                name="Valor em Pipeline"
                fill="hsl(var(--primary))"
                radius={[6, 6, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {/* Stage distribution bar chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-5">Contagem por Etapa</h2>
          {funnelData.every((d) => d.count === 0) ? (
            <div className="h-48 flex items-center justify-center text-muted-foreground">
              Nenhuma oportunidade cadastrada
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={funnelData} margin={{ left: 8, right: 8, top: 4, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CountTooltip />} />
                <Bar dataKey="count" name="Quantidade" radius={[6, 6, 0, 0]} maxBarSize={44}>
                  {funnelData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Won vs Active summary */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-5">Resumo de Performance</h2>
          <div className="space-y-4">
            {/* Win rate visual */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">Taxa de conversão</span>
                <span className="font-semibold">{conversionRate}%</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-success rounded-full transition-all duration-700"
                  style={{ width: `${conversionRate}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-success/8 border border-success/20 rounded-xl p-4">
                <p className="text-2xl font-bold text-success">{won.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Oportunidades Ganhas</p>
                <p className="text-xs font-semibold text-success mt-1">{formatCurrency(wonValue)}</p>
              </div>
              <div className="bg-primary/8 border border-primary/20 rounded-xl p-4">
                <p className="text-2xl font-bold text-primary">{active.length}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Em Negociação</p>
                <p className="text-xs font-semibold text-primary mt-1">{formatCurrency(pipelineValue)}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-1">
              {STAGE_ORDER.filter((s) => s !== "ganha").map((stage, i) => {
                const count = opportunities.filter((o) => o.status === stage).length;
                return (
                  <div key={i} className="text-center p-3 rounded-lg bg-muted/40">
                    <p
                      className="text-xl font-bold"
                      style={{ color: STAGE_COLORS[i] }}
                    >
                      {count}
                    </p>
                    <p className="text-[10px] text-muted-foreground leading-tight mt-0.5">
                      {STAGE_LABELS[stage]}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Opportunities Table */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Oportunidades Recentes</h2>
          <Link
            to="/oportunidades"
            className="text-sm text-primary hover:underline flex items-center gap-1"
          >
            Ver todas <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        {opportunities.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            Nenhuma oportunidade cadastrada
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground text-xs uppercase tracking-wide">
                  <th className="text-left pb-3 font-medium">Oportunidade</th>
                  <th className="text-left pb-3 font-medium hidden md:table-cell">Cliente</th>
                  <th className="text-left pb-3 font-medium hidden lg:table-cell">Responsável</th>
                  <th className="text-left pb-3 font-medium">Valor</th>
                  <th className="text-left pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {opportunities.slice(0, 10).map((opp, i) => {
                  const stageIndex = STAGE_ORDER.indexOf(opp.status);
                  const color = STAGE_COLORS[stageIndex] ?? "#6b7280";
                  return (
                    <tr key={i} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3.5 pr-4">
                        <p className="font-medium leading-tight">{opp.title}</p>
                        <p className="text-xs text-muted-foreground md:hidden">{opp.client}</p>
                      </td>
                      <td className="py-3.5 pr-4 text-muted-foreground hidden md:table-cell">
                        {opp.client}
                      </td>
                      <td className="py-3.5 pr-4 text-muted-foreground hidden lg:table-cell">
                        {opp.responsible || "—"}
                      </td>
                      <td className="py-3.5 pr-4 font-semibold">
                        {opp.value || "—"}
                      </td>
                      <td className="py-3.5">
                        <span
                          className="text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{
                            backgroundColor: `${color}18`,
                            color,
                          }}
                        >
                          {STAGE_LABELS[opp.status]}
                        </span>
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
