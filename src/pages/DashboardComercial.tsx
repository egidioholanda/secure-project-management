import { useMemo } from "react";
import { useOpportunities } from "@/hooks/useOpportunities";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import {
  DollarSign, TrendingUp, Target, Award, ArrowRight,
  Users, LayoutGrid, Package, Wrench,
} from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

// ── Constants ────────────────────────────────────────────────────────────────

const STAGE_CONFIG = [
  { key: "prospeccao", matchKeys: ["prospeccao", "qualificacao"],                       label: "Oportunidade",     color: "#6366f1" },
  { key: "proposta",   matchKeys: ["proposta"],                                          label: "Proposta Enviada", color: "#f59e0b" },
  { key: "negociacao", matchKeys: ["negociacao", "pedido_produto", "pedido_servico"],    label: "Pedido feito",     color: "#f97316" },
  { key: "ganha",      matchKeys: ["ganha", "faturado_produto", "faturado_servico"],     label: "Pedido Faturado",  color: "#10b981" },
];

const TYPE_COLORS = ["#6366f1", "#3b82f6", "#f59e0b", "#f97316", "#10b981", "#ec4899", "#06b6d4"];

// ── Helpers ──────────────────────────────────────────────────────────────────

const parseBRL = (raw: string) => {
  if (!raw) return 0;
  const n = parseFloat(raw.replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
};

const formatCurrency = (value: number) => {
  if (value >= 1_000_000) return `R$ ${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000)     return `R$ ${(value / 1_000).toFixed(0)}K`;
  return `R$ ${value.toFixed(0)}`;
};

const formatCurrencyFull = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);

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
  const { opportunities, loading } = useOpportunities();

  // ── Core aggregations ─────────────────────────────────────────────────────

  const WON_STATUSES = ["ganha", "faturado_produto", "faturado_servico"];
  const won    = useMemo(() => opportunities.filter((o) => WON_STATUSES.includes(o.status)), [opportunities]);
  const active = useMemo(() => opportunities.filter((o) => !WON_STATUSES.includes(o.status)), [opportunities]);

  const pipelineValue    = useMemo(() => active.reduce((s, o) => s + parseBRL(o.value), 0), [active]);
  const wonValue         = useMemo(() => won.reduce((s, o) => s + parseBRL(o.value), 0), [won]);
  const wonProductValue  = useMemo(() => won.reduce((s, o) => s + parseBRL(o.productValue), 0), [won]);
  const wonServiceValue  = useMemo(() => won.reduce((s, o) => s + parseBRL(o.serviceValue), 0), [won]);
  const conversionRate   = opportunities.length > 0 ? Math.round((won.length / opportunities.length) * 100) : 0;
  const ticketMedio      = won.length > 0 ? wonValue / won.length : 0;

  // ── Funnel by value ───────────────────────────────────────────────────────

  const funnelData = useMemo(() =>
    STAGE_CONFIG.map((stage) => {
      const opps  = opportunities.filter((o) => stage.matchKeys.includes(o.status));
      const value = opps.reduce((s, o) => s + parseBRL(o.value), 0);
      return { ...stage, count: opps.length, value };
    }),
    [opportunities]
  );

  const maxFunnelValue = Math.max(...funnelData.map((s) => s.value), 1);

  // ── By responsible ────────────────────────────────────────────────────────

  const responsibleData = useMemo(() => {
    const map: Record<string, number> = {};
    active.forEach((o) => {
      const r = o.responsible || "Sem responsável";
      map[r] = (map[r] || 0) + parseBRL(o.value);
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name: name.split(" ")[0], value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [active]);

  // ── By type (pie) ─────────────────────────────────────────────────────────

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

  // ── Top opportunities by value ────────────────────────────────────────────

  const topOpps = useMemo(() =>
    [...opportunities]
      .sort((a, b) => parseBRL(b.value) - parseBRL(a.value))
      .slice(0, 8),
    [opportunities]
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

  const empty = opportunities.length === 0;

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
          label="Pedido Faturado"
          value={formatCurrency(wonValue)}
          sub={`${won.length} pedido${won.length !== 1 ? "s" : ""} faturado${won.length !== 1 ? "s" : ""}`}
          color="text-emerald-500"
        />
        <KpiCard
          icon={TrendingUp}
          label="Taxa de Conversão"
          value={`${conversionRate}%`}
          sub={`${won.length} de ${opportunities.length} oportunidades`}
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

      {/* ── Produto × Serviço faturado ── */}
      {(wonProductValue > 0 || wonServiceValue > 0) && (
        <div className="grid grid-cols-2 gap-4">
          <KpiCard
            icon={Package}
            label="Faturado — Produto"
            value={formatCurrency(wonProductValue)}
            sub={formatCurrencyFull(wonProductValue)}
            color="text-violet-500"
          />
          <KpiCard
            icon={Wrench}
            label="Faturado — Serviço"
            value={formatCurrency(wonServiceValue)}
            sub={formatCurrencyFull(wonServiceValue)}
            color="text-blue-500"
          />
        </div>
      )}

      {/* ── Funil por Valor (hero chart) ── */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold">Funil por Valor</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Distribuição do valor total por etapa do pipeline
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total (ativo + faturado)</p>
            <p className="text-lg font-bold">{formatCurrency(pipelineValue + wonValue)}</p>
          </div>
        </div>

        {empty ? (
          <div className="h-40 flex items-center justify-center text-muted-foreground">
            Nenhuma oportunidade cadastrada
          </div>
        ) : (
          <div className="space-y-4">
            {funnelData.map((stage) => {
              const barPct = maxFunnelValue > 0
                ? Math.max((stage.value / maxFunnelValue) * 100, stage.count > 0 ? 4 : 0)
                : 0;
              return (
                <div key={stage.key} className="flex items-center gap-4">
                  {/* Label */}
                  <div className="w-36 shrink-0 flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground leading-tight">
                      {stage.label}
                    </span>
                  </div>

                  {/* Count badge */}
                  <div
                    className="w-8 shrink-0 text-center text-xs font-bold rounded-full py-0.5"
                    style={{ backgroundColor: `${stage.color}20`, color: stage.color }}
                  >
                    {stage.count}
                  </div>

                  {/* Value bar */}
                  <div className="flex-1 h-9 bg-muted/50 rounded-lg overflow-hidden">
                    {stage.count === 0 ? (
                      <div className="h-full flex items-center px-3">
                        <span className="text-xs text-muted-foreground">Sem oportunidades</span>
                      </div>
                    ) : (
                      <div
                        className="h-full rounded-lg flex items-center px-3 transition-all duration-700"
                        style={{ width: `${barPct}%`, backgroundColor: stage.color }}
                      >
                        <span className="text-white text-xs font-semibold truncate">
                          {formatCurrency(stage.value)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Value label */}
                  <div className="w-20 shrink-0 text-right">
                    <p className="text-sm font-bold" style={{ color: stage.count > 0 ? stage.color : undefined }}>
                      {stage.count > 0 ? formatCurrency(stage.value) : "—"}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Conversion rate between stages */}
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

        {/* Por Responsável */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Pipeline por Responsável</h2>
          </div>
          {responsibleData.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-muted-foreground">
              Nenhuma oportunidade ativa
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={responsibleData}
                layout="vertical"
                margin={{ left: 0, right: 24, top: 4, bottom: 4 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis
                  type="number"
                  tickFormatter={(v) => formatCurrency(v)}
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                  axisLine={false}
                  tickLine={false}
                  width={60}
                />
                <Tooltip content={<CurrencyTooltip />} />
                <Bar
                  dataKey="value"
                  name="Pipeline"
                  fill="hsl(var(--primary))"
                  radius={[0, 6, 6, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Por Tipo */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            <h2 className="text-lg font-semibold">Distribuição por Tipo</h2>
          </div>
          {typeData.length === 0 ? (
            <div className="h-52 flex items-center justify-center text-muted-foreground">
              Nenhuma oportunidade cadastrada
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={236}>
              <PieChart>
                <Pie
                  data={typeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {typeData.map((_, i) => (
                    <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
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

      {/* ── Maiores Oportunidades ── */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold">Maiores Oportunidades</h2>
            <p className="text-sm text-muted-foreground mt-0.5">Ordenadas por valor decrescente</p>
          </div>
          <Button asChild variant="ghost" size="sm" className="gap-1 text-primary">
            <Link to="/oportunidades">
              Ver todas <ArrowRight className="w-3 h-3" />
            </Link>
          </Button>
        </div>

        {empty ? (
          <div className="py-12 text-center text-muted-foreground">
            Nenhuma oportunidade cadastrada
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left pb-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Oportunidade
                  </th>
                  <th className="text-left pb-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden md:table-cell">
                    Cliente
                  </th>
                  <th className="text-left pb-3 text-xs font-medium text-muted-foreground uppercase tracking-wide hidden lg:table-cell">
                    Responsável
                  </th>
                  <th className="text-right pb-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Valor
                  </th>
                  <th className="text-left pb-3 text-xs font-medium text-muted-foreground uppercase tracking-wide pl-4">
                    Etapa
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {topOpps.map((opp, i) => {
                  const stage = STAGE_CONFIG.find((s) => s.matchKeys.includes(opp.status));
                  return (
                    <tr key={i} className="hover:bg-muted/30 transition-colors group">
                      <td className="py-3.5 pr-4">
                        <p className="font-medium leading-tight">{opp.title}</p>
                        <p className="text-xs text-muted-foreground md:hidden mt-0.5">{opp.client}</p>
                      </td>
                      <td className="py-3.5 pr-4 text-muted-foreground hidden md:table-cell">
                        {opp.client}
                      </td>
                      <td className="py-3.5 pr-4 text-muted-foreground hidden lg:table-cell">
                        {opp.responsible || "—"}
                      </td>
                      <td className="py-3.5 pr-4 text-right">
                        <p className="font-bold tabular-nums">{opp.value || "—"}</p>
                        {(opp.productValue || opp.serviceValue) && (
                          <div className="flex gap-2 justify-end mt-0.5">
                            {opp.productValue && (
                              <span className="text-xs text-violet-500 tabular-nums">
                                P: {formatCurrency(parseBRL(opp.productValue))}
                              </span>
                            )}
                            {opp.serviceValue && (
                              <span className="text-xs text-blue-500 tabular-nums">
                                S: {formatCurrency(parseBRL(opp.serviceValue))}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 pl-4">
                        {stage && (
                          <span
                            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                            style={{ backgroundColor: `${stage.color}18`, color: stage.color }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: stage.color }}
                            />
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
