import { useState, useMemo } from 'react';
import {
  Shield, Search, X, ChevronDown, ChevronRight,
  Clock, User2, Activity, Filter,
} from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAuditLogs, type AuditLog, type AuditPeriod } from '@/hooks/useAuditLogs';

// ─── Configuração de ações ──────────────────────────────────

const ACTION_CONFIG: Record<string, { label: string; className: string }> = {
  CREATE:  { label: 'Criação',     className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0' },
  UPDATE:  { label: 'Atualização', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0' },
  DELETE:  { label: 'Exclusão',    className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0' },
  LOGIN:   { label: 'Login',       className: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0' },
  LOGOUT:  { label: 'Logout',      className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-0' },
  APPROVE: { label: 'Aprovação',   className: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-0' },
  REJECT:  { label: 'Rejeição',    className: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-0' },
};

const RESOURCE_LABELS: Record<string, string> = {
  clients:               'Clientes',
  projects:              'Projetos',
  maintenance_contracts: 'Contratos',
  maintenance_orders:    'Ordens de Serviço',
  schedule_tasks:        'Tarefas',
  profiles:              'Usuários',
  user_roles:            'Permissões',
  auth:                  'Autenticação',
};

const SYSTEM_FIELDS = new Set([
  'id', 'created_at', 'updated_at', 'user_id', 'client_id',
  'project_id', 'team_id', 'avatar_url', 'color',
]);

// ─── Componente de diff ────────────────────────────────────

function DiffView({
  oldValues,
  newValues,
  action,
}: {
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  action: string;
}) {
  if (!oldValues && !newValues) {
    return <p className="text-xs text-muted-foreground italic">Sem detalhes registrados.</p>;
  }

  const allKeys = Array.from(
    new Set([...Object.keys(oldValues ?? {}), ...Object.keys(newValues ?? {})]),
  ).filter((k) => !SYSTEM_FIELDS.has(k));

  const isChangeset = action === 'UPDATE' || action === 'APPROVE' || action === 'REJECT';
  const displayKeys = isChangeset
    ? allKeys.filter(
        (k) =>
          JSON.stringify((oldValues ?? {})[k]) !== JSON.stringify((newValues ?? {})[k]),
      )
    : allKeys;

  if (displayKeys.length === 0) {
    return <p className="text-xs text-muted-foreground italic">Nenhum campo visível alterado.</p>;
  }

  const fmt = (v: unknown) => {
    if (v === null || v === undefined) return <span className="italic text-muted-foreground">—</span>;
    if (typeof v === 'boolean') return v ? 'sim' : 'não';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted-foreground border-b border-border">
            <th className="text-left py-1.5 pr-6 font-semibold w-40">Campo</th>
            {isChangeset && <th className="text-left py-1.5 pr-6 font-semibold">Antes</th>}
            <th className="text-left py-1.5 font-semibold">
              {action === 'DELETE' ? 'Valor' : 'Depois'}
            </th>
          </tr>
        </thead>
        <tbody>
          {displayKeys.map((k) => (
            <tr key={k} className="border-b border-border/40">
              <td className="py-1.5 pr-6 font-mono text-muted-foreground">{k}</td>
              {isChangeset && (
                <td className="py-1.5 pr-6 text-red-600 dark:text-red-400 line-through">
                  {fmt((oldValues ?? {})[k])}
                </td>
              )}
              <td className={`py-1.5 ${action !== 'DELETE' ? 'text-emerald-600 dark:text-emerald-400' : ''}`}>
                {action === 'DELETE' ? fmt((oldValues ?? {})[k]) : fmt((newValues ?? {})[k])}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Linha de evento ───────────────────────────────────────

function EventRow({ log, expanded, onToggle }: {
  log: AuditLog;
  expanded: boolean;
  onToggle: () => void;
}) {
  const actionCfg = ACTION_CONFIG[log.action] ?? {
    label: log.action,
    className: 'bg-slate-100 text-slate-600 border-0',
  };
  const resourceLabel = RESOURCE_LABELS[log.resource_type] ?? log.resource_type;

  return (
    <div className="group">
      <button className="w-full text-left" onClick={onToggle}>
        <div className="grid grid-cols-1 md:grid-cols-[160px_1fr_100px_140px_1fr_32px] gap-2 md:gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
          {/* Timestamp */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="font-mono text-xs">
              {format(new Date(log.created_at), 'dd/MM/yy HH:mm:ss', { locale: ptBR })}
            </span>
          </div>

          {/* Usuário */}
          <div className="flex items-center gap-2 min-w-0">
            <User2 className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-sm font-medium truncate leading-tight">
                {log.user_name ?? 'Sistema'}
              </p>
              <p className="text-xs text-muted-foreground truncate leading-tight">
                {log.user_email ?? ''}
              </p>
            </div>
          </div>

          {/* Ação */}
          <div className="flex items-center">
            <Badge className={`text-xs px-2 py-0.5 ${actionCfg.className}`}>
              {actionCfg.label}
            </Badge>
          </div>

          {/* Recurso */}
          <div className="flex items-center">
            <span className="text-sm text-muted-foreground">{resourceLabel}</span>
          </div>

          {/* Identificador */}
          <div className="flex items-center">
            <span className="text-sm truncate text-foreground">
              {log.resource_name ?? log.resource_id ?? '—'}
            </span>
          </div>

          {/* Chevron */}
          <div className="hidden md:flex items-center justify-center text-muted-foreground">
            {expanded
              ? <ChevronDown className="w-3.5 h-3.5" />
              : <ChevronRight className="w-3.5 h-3.5 group-hover:text-foreground transition-colors" />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 bg-muted/20 border-t border-border">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider py-3">
            Detalhes da alteração
          </p>
          <DiffView
            oldValues={log.old_values}
            newValues={log.new_values}
            action={log.action}
          />
        </div>
      )}
    </div>
  );
}

// ─── Página principal ──────────────────────────────────────

export default function Audit() {
  const [period, setPeriod]           = useState<AuditPeriod>('7d');
  const [action, setAction]           = useState('');
  const [resourceType, setResourceType] = useState('');
  const [userSearch, setUserSearch]   = useState('');
  const [expandedId, setExpandedId]   = useState<string | null>(null);

  const { data: logs = [], isLoading: logsLoading } = useAuditLogs({
    period, action, resourceType, userSearch,
  });

  const stats = useMemo(() => {
    const todayStart = startOfDay(new Date());
    return {
      total:   logs.length,
      today:   logs.filter((l) => new Date(l.created_at) >= todayStart).length,
      creates: logs.filter((l) => l.action === 'CREATE').length,
      updates: logs.filter((l) => l.action === 'UPDATE').length,
      deletes: logs.filter((l) => l.action === 'DELETE').length,
    };
  }, [logs]);

  const hasActiveFilters = !!(action || resourceType || userSearch || period !== '7d');

  const clearFilters = () => {
    setPeriod('7d');
    setAction('');
    setResourceType('');
    setUserSearch('');
  };

  // Acesso à rota já é controlado pelo ProtectedRoute com base nas
  // páginas liberadas para o perfil do usuário (allowedPages).

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
          <Shield className="w-5 h-5 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Auditoria</h1>
          <p className="text-sm text-muted-foreground">
            Registro completo de atividades do sistema
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {([
          { label: 'Total no período', value: stats.total,   color: 'text-foreground' },
          { label: 'Hoje',             value: stats.today,   color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Criações',         value: stats.creates, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Atualizações',     value: stats.updates, color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Exclusões',        value: stats.deletes, color: 'text-red-600 dark:text-red-400' },
        ] as const).map((s) => (
          <Card key={s.label} className="border border-border">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>
                {logsLoading ? '—' : s.value}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filtros */}
      <Card className="border border-border">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-3 items-center">
            <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />

            <Select value={period} onValueChange={(v) => setPeriod(v as AuditPeriod)}>
              <SelectTrigger className="w-40 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="7d">Últimos 7 dias</SelectItem>
                <SelectItem value="30d">Últimos 30 dias</SelectItem>
                <SelectItem value="all">Todos</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={action || '__ALL__'}
              onValueChange={(v) => setAction(v === '__ALL__' ? '' : v)}
            >
              <SelectTrigger className="w-44 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">Todas as ações</SelectItem>
                <SelectItem value="CREATE">Criação</SelectItem>
                <SelectItem value="UPDATE">Atualização</SelectItem>
                <SelectItem value="DELETE">Exclusão</SelectItem>
                <SelectItem value="LOGIN">Login</SelectItem>
                <SelectItem value="APPROVE">Aprovação</SelectItem>
                <SelectItem value="REJECT">Rejeição</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={resourceType || '__ALL__'}
              onValueChange={(v) => setResourceType(v === '__ALL__' ? '' : v)}
            >
              <SelectTrigger className="w-52 h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ALL__">Todos os recursos</SelectItem>
                {Object.entries(RESOURCE_LABELS).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-8 h-9 text-sm"
                placeholder="Buscar por usuário..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
              />
            </div>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-9 gap-1.5" onClick={clearFilters}>
                <X className="w-3.5 h-3.5" />
                Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de eventos */}
      <Card className="border border-border overflow-hidden">
        {/* Cabeçalho da tabela */}
        <div className="hidden md:grid grid-cols-[160px_1fr_100px_140px_1fr_32px] gap-3 px-4 py-2.5 bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <span>Data / Hora</span>
          <span>Usuário</span>
          <span>Ação</span>
          <span>Recurso</span>
          <span>Identificador</span>
          <span />
        </div>

        {logsLoading ? (
          <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
            Carregando eventos...
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <Activity className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Nenhum evento encontrado</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {logs.map((log) => (
              <EventRow
                key={log.id}
                log={log}
                expanded={expandedId === log.id}
                onToggle={() => setExpandedId(expandedId === log.id ? null : log.id)}
              />
            ))}
          </div>
        )}

        {logs.length === 500 && (
          <div className="px-4 py-3 bg-muted/30 border-t border-border text-center">
            <p className="text-xs text-muted-foreground">
              Exibindo os 500 eventos mais recentes. Use os filtros para refinar a busca.
            </p>
          </div>
        )}
      </Card>
    </div>
  );
}
