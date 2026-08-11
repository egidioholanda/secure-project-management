import { useMemo } from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  addDays, addMonths, subMonths,
  startOfMonth, endOfMonth,
  format, parseISO, isAfter, isBefore,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DollarSign, TrendingUp, FileText, AlertTriangle,
  Calendar, Users, Wrench,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminContracts, useAdminOrders, type AdminContract } from '@/hooks/useAdminDashboard';

// ─── Utilitários ───────────────────────────────────────────

const PERIODICITY_DIVISOR: Record<string, number> = {
  monthly: 1, quarterly: 3, semiannual: 6, annual: 12,
};

function toMRR(c: AdminContract): number {
  return (c.value || 0) / (PERIODICITY_DIVISOR[c.periodicity ?? 'monthly'] ?? 1);
}

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency', currency: 'BRL',
  minimumFractionDigits: 0, maximumFractionDigits: 0,
});

const isScheduled  = (s: string) => ['scheduled', 'agendada'].includes(s);
const isInProgress = (s: string) => ['in_progress', 'em_andamento'].includes(s);
const isCompleted  = (s: string) => ['completed', 'concluida', 'concluída'].includes(s);

// ─── Tooltips customizados ────────────────────────────────

const CurrencyTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-foreground mb-0.5">{label}</p>
      <p className="text-emerald-600 dark:text-emerald-400">{BRL.format(payload[0].value)}</p>
    </div>
  );
};

const CountTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-foreground mb-0.5">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

// ─── KPI card ─────────────────────────────────────────────

function KPICard({
  label, value, sub, icon: Icon, iconColor, trend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  iconColor: string;
  trend?: { value: number; label: string };
}) {
  return (
    <Card className="border border-border">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
              {label}
            </p>
            <p className="text-2xl font-bold text-foreground mt-1 leading-none">{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
            {trend && (
              <p className={`text-xs mt-1 font-medium ${trend.value >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                {trend.value >= 0 ? '+' : ''}{trend.value} {trend.label}
              </p>
            )}
          </div>
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColor}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Expiring alert card ──────────────────────────────────

function ExpiringCard({
  count, revenue, label, colorClass, contracts,
}: {
  count: number; revenue: number; label: string;
  colorClass: string; contracts: AdminContract[];
}) {
  return (
    <Card className={`border ${colorClass}`}>
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm font-semibold">{label}</span>
          <Badge variant="outline" className="ml-auto text-xs">{count} contrato{count !== 1 ? 's' : ''}</Badge>
        </div>
        <p className="text-lg font-bold">{BRL.format(revenue)}<span className="text-xs font-normal text-muted-foreground ml-1">/mês em risco</span></p>
        {contracts.slice(0, 3).map((c) => (
          <p key={c.id} className="text-xs text-muted-foreground truncate mt-1">
            {c.clients?.name ?? '—'} — {c.title}
            {c.end_date && (
              <span className="ml-1 font-medium">
                ({format(parseISO(c.end_date), 'dd/MM/yy')})
              </span>
            )}
          </p>
        ))}
        {count > 3 && (
          <p className="text-xs text-muted-foreground mt-1">+{count - 3} mais</p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Skeleton de loading ──────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-64 rounded-lg" />
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Skeleton className="h-72 rounded-xl col-span-2" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────

export default function DashboardAdmin() {
  const { isLoading: authLoading } = useAuthContext();
  const { data: contracts = [], isLoading: contractsLoading } = useAdminContracts();
  const { data: orders = [],   isLoading: ordersLoading   } = useAdminOrders();

  const isLoading = authLoading || contractsLoading || ordersLoading;

  // ─── Métricas computadas ─────────────────────────────────

  const metrics = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);

    const active   = contracts.filter(c => c.status === 'active');
    const inactive = contracts.filter(c => c.status === 'inactive');
    const expired  = contracts.filter(c => c.status === 'expired');

    const mrr = active.reduce((s, c) => s + toMRR(c), 0);
    const arr = mrr * 12;
    const avgTicket = active.length > 0 ? mrr / active.length : 0;

    const newThisMonth = contracts.filter(
      c => new Date(c.created_at) >= monthStart,
    ).length;

    const churnThisMonth = contracts.filter(
      c => (c.status === 'expired' || c.status === 'inactive') &&
        new Date(c.updated_at) >= monthStart,
    ).length;

    // MRR evolution: last 12 months
    const mrrEvolution = Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(now, 11 - i);
      const ms = startOfMonth(d);
      const me = endOfMonth(d);

      const monthMRR = contracts.reduce((sum, c) => {
        const start = c.start_date ? parseISO(c.start_date) : null;
        const end   = c.end_date   ? parseISO(c.end_date)   : null;
        if (start && isAfter(start, me)) return sum;
        if (end   && isBefore(end, ms)) return sum;
        return sum + toMRR(c);
      }, 0);

      return { month: format(d, 'MMM/yy', { locale: ptBR }), mrr: Math.round(monthMRR) };
    });

    // Status distribution
    const byStatus = [
      { name: 'Ativos',   value: active.length,   color: '#10b981' },
      { name: 'Inativos', value: inactive.length,  color: '#6b7280' },
      { name: 'Vencidos', value: expired.length,   color: '#ef4444' },
    ].filter(d => d.value > 0);

    // Revenue by type
    const revenueByType = [
      { name: 'Prev. + Corretiva', mrr: Math.round(active.filter(c => c.type === 'both').reduce((s, c) => s + toMRR(c), 0)), color: '#6366f1' },
      { name: 'Preventiva',        mrr: Math.round(active.filter(c => c.type === 'preventive').reduce((s, c) => s + toMRR(c), 0)), color: '#3b82f6' },
      { name: 'Corretiva',         mrr: Math.round(active.filter(c => c.type === 'corrective').reduce((s, c) => s + toMRR(c), 0)), color: '#f97316' },
    ].filter(d => d.mrr > 0);

    // Count by periodicity
    const byPeriodicity = [
      { name: 'Mensal',     count: active.filter(c => c.periodicity === 'monthly').length },
      { name: 'Trimestral', count: active.filter(c => c.periodicity === 'quarterly').length },
      { name: 'Semestral',  count: active.filter(c => c.periodicity === 'semiannual').length },
      { name: 'Anual',      count: active.filter(c => c.periodicity === 'annual').length },
    ].filter(d => d.count > 0);

    // Expiring soon
    const in30  = addDays(now, 30);
    const in60  = addDays(now, 60);
    const in90  = addDays(now, 90);

    const expiring30 = active.filter(c => c.end_date && !isBefore(parseISO(c.end_date), now) && !isAfter(parseISO(c.end_date), in30));
    const expiring60 = active.filter(c => c.end_date && isAfter(parseISO(c.end_date), in30) && !isAfter(parseISO(c.end_date), in60));
    const expiring90 = active.filter(c => c.end_date && isAfter(parseISO(c.end_date), in60) && !isAfter(parseISO(c.end_date), in90));

    // 6-month forecast (expiration per month)
    const forecast = Array.from({ length: 6 }, (_, i) => {
      const d = addMonths(now, i);
      const ms = startOfMonth(d);
      const me = endOfMonth(d);
      const expiring = active.filter(c => {
        if (!c.end_date) return false;
        const e = parseISO(c.end_date);
        return !isBefore(e, ms) && !isAfter(e, me);
      });
      return {
        month: format(d, 'MMM/yy', { locale: ptBR }),
        contratos: expiring.length,
        receita: Math.round(expiring.reduce((s, c) => s + toMRR(c), 0)),
      };
    });

    // Top 5 clients by MRR
    const clientMap = new Map<string, { name: string; mrr: number; count: number }>();
    active.forEach(c => {
      const name = c.clients?.name ?? 'Desconhecido';
      const existing = clientMap.get(c.client_id) ?? { name, mrr: 0, count: 0 };
      existing.mrr += toMRR(c);
      existing.count += 1;
      clientMap.set(c.client_id, existing);
    });
    const top5 = Array.from(clientMap.values())
      .sort((a, b) => b.mrr - a.mrr)
      .slice(0, 5);

    // OS stats
    const osScheduled  = orders.filter(o => isScheduled(o.status)).length;
    const osInProgress = orders.filter(o => isInProgress(o.status)).length;
    const osCompleted  = orders.filter(o => isCompleted(o.status) && new Date(o.created_at) >= monthStart).length;
    const osTotal      = orders.length;

    const osByType = [
      { name: 'Preventivas', value: orders.filter(o => o.type === 'preventive' || o.type === 'preventiva').length, color: '#3b82f6' },
      { name: 'Corretivas',  value: orders.filter(o => o.type === 'corrective' || o.type === 'corretiva').length,  color: '#f97316' },
    ].filter(d => d.value > 0);

    return {
      mrr, arr, avgTicket,
      activeCount: active.length,
      newThisMonth, churnThisMonth,
      mrrEvolution, byStatus, revenueByType, byPeriodicity,
      expiring30, expiring60, expiring90,
      forecast, top5,
      osScheduled, osInProgress, osCompleted, osTotal, osByType,
    };
  }, [contracts, orders]);

  // ─── Guards ──────────────────────────────────────────────
  // Acesso à rota já é controlado pelo ProtectedRoute com base nas
  // páginas liberadas para o perfil do usuário (allowedPages).

  if (isLoading) return <DashboardSkeleton />;

  const today = format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });

  return (
    <div className="space-y-6">

      {/* ─── Header ─── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard Financeiro</h1>
          <p className="text-sm text-muted-foreground capitalize">{today}</p>
        </div>
      </div>

      {/* ─── KPI Strip ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          label="MRR"
          value={BRL.format(metrics.mrr)}
          sub="Receita mensal recorrente"
          icon={DollarSign}
          iconColor="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
        />
        <KPICard
          label="ARR"
          value={BRL.format(metrics.arr)}
          sub="Projeção anual"
          icon={TrendingUp}
          iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        />
        <KPICard
          label="Ticket Médio"
          value={BRL.format(metrics.avgTicket)}
          sub="Por contrato ativo"
          icon={FileText}
          iconColor="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
        />
        <KPICard
          label="Contratos Ativos"
          value={metrics.activeCount}
          sub={`${contracts.length} no total`}
          icon={FileText}
          iconColor="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
        />
        <KPICard
          label="Novos no Mês"
          value={metrics.newThisMonth}
          sub="Contratos criados"
          icon={Calendar}
          iconColor="bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400"
          trend={{ value: metrics.newThisMonth, label: 'este mês' }}
        />
        <KPICard
          label="Churn no Mês"
          value={metrics.churnThisMonth}
          sub="Encerrados/inativos"
          icon={AlertTriangle}
          iconColor="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
        />
      </div>

      {/* ─── MRR Evolution + OS Overview ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* MRR Evolution */}
        <Card className="border border-border lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Evolução do MRR — últimos 12 meses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={metrics.mrrEvolution} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="mrrGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#10b981" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tickFormatter={(v) => BRL.format(v)}
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  axisLine={false} tickLine={false} width={80}
                />
                <Tooltip content={<CurrencyTooltip />} />
                <Area
                  type="monotone" dataKey="mrr" name="MRR"
                  stroke="#10b981" strokeWidth={2}
                  fill="url(#mrrGrad)"
                  dot={{ fill: '#10b981', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* OS Overview */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Ordens de Serviço</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Agendadas',     value: metrics.osScheduled,  color: 'text-blue-600',  bg: 'bg-blue-50 dark:bg-blue-900/20' },
                { label: 'Em Andamento',  value: metrics.osInProgress, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/20' },
                { label: 'Concluídas/mês',value: metrics.osCompleted,  color: 'text-emerald-600',bg: 'bg-emerald-50 dark:bg-emerald-900/20' },
                { label: 'Total',         value: metrics.osTotal,      color: 'text-foreground', bg: 'bg-muted/50' },
              ].map((s) => (
                <div key={s.label} className={`${s.bg} rounded-lg p-3 text-center`}>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-muted-foreground leading-tight mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {metrics.osByType.length > 0 && (
              <>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-1">Por tipo</p>
                <ResponsiveContainer width="100%" height={100}>
                  <PieChart>
                    <Pie data={metrics.osByType} cx="50%" cy="50%" innerRadius={28} outerRadius={44} paddingAngle={4} dataKey="value" strokeWidth={0}>
                      {metrics.osByType.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip content={<CountTooltip />} />
                    <Legend iconType="circle" iconSize={7} formatter={(v) => <span className="text-xs text-foreground">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Distribution charts ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Contracts by status */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Contratos por Status</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.byStatus.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={metrics.byStatus} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={4} dataKey="value" strokeWidth={0}>
                    {metrics.byStatus.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={<CountTooltip />} />
                  <Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-sm text-foreground">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Revenue by contract type */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Receita Mensal por Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.revenueByType.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem dados</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={metrics.revenueByType} layout="vertical" margin={{ left: 0, right: 24, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" tickFormatter={(v) => BRL.format(v)} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CurrencyTooltip />} />
                  <Bar dataKey="mrr" radius={[0, 6, 6, 0]} maxBarSize={28}>
                    {metrics.revenueByType.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Contracts by periodicity */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Ativos por Periodicidade</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.byPeriodicity.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem contratos ativos</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={metrics.byPeriodicity} layout="vertical" margin={{ left: 0, right: 24, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CountTooltip />} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ─── Expiring soon ─── */}
      {(metrics.expiring30.length > 0 || metrics.expiring60.length > 0 || metrics.expiring90.length > 0) && (
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Contratos com vencimento próximo
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ExpiringCard
              count={metrics.expiring30.length}
              revenue={metrics.expiring30.reduce((s, c) => s + toMRR(c), 0)}
              label="Vencem em até 30 dias"
              colorClass="border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-900/10 text-red-700 dark:text-red-400"
              contracts={metrics.expiring30}
            />
            <ExpiringCard
              count={metrics.expiring60.length}
              revenue={metrics.expiring60.reduce((s, c) => s + toMRR(c), 0)}
              label="Vencem em 31–60 dias"
              colorClass="border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-900/10 text-orange-700 dark:text-orange-400"
              contracts={metrics.expiring60}
            />
            <ExpiringCard
              count={metrics.expiring90.length}
              revenue={metrics.expiring90.reduce((s, c) => s + toMRR(c), 0)}
              label="Vencem em 61–90 dias"
              colorClass="border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400"
              contracts={metrics.expiring90}
            />
          </div>
        </div>
      )}

      {/* ─── Forecast + Top clients ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 6-month vencimento forecast */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Previsão de Vencimentos — próximos 6 meses</CardTitle>
            <p className="text-xs text-muted-foreground">Contratos ativos que expiram em cada mês</p>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={metrics.forecast} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                <Tooltip content={<CountTooltip />} />
                <Bar dataKey="contratos" name="Contratos" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 space-y-1">
              {metrics.forecast.filter(f => f.contratos > 0).map((f) => (
                <div key={f.month} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{f.month}</span>
                  <span className="font-medium">{f.contratos} contrato{f.contratos !== 1 ? 's' : ''} — <span className="text-orange-600">{BRL.format(f.receita)}/mês em risco</span></span>
                </div>
              ))}
              {metrics.forecast.every(f => f.contratos === 0) && (
                <p className="text-xs text-muted-foreground text-center py-2">Nenhum vencimento nos próximos 6 meses</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top 5 clients */}
        <Card className="border border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Top 5 Clientes por Receita Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.top5.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Sem contratos ativos</p>
            ) : (
              <div className="space-y-3">
                {metrics.top5.map((client, i) => {
                  const pct = metrics.mrr > 0 ? (client.mrr / metrics.mrr) * 100 : 0;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs font-bold flex-shrink-0">
                            {i + 1}
                          </span>
                          <span className="font-medium truncate">{client.name}</span>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {client.count} contrato{client.count !== 1 ? 's' : ''}
                          </Badge>
                        </div>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400 flex-shrink-0 ml-2">
                          {BRL.format(client.mrr)}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">{pct.toFixed(1)}% do MRR total</p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
