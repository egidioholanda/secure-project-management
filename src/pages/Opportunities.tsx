import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Search, Filter, X, TrendingUp, CalendarClock,
  Trophy, Percent, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { useAuthContext } from "@/contexts/AuthContext";
import { useOpportunities, type Opportunity } from "@/hooks/useOpportunities";
import { useClientGroups } from "@/hooks/useClientGroups";
import { useProjects } from "@/hooks/useProjects";
import { OpportunityCard } from "@/components/Opportunities/OpportunityCard";
import { AddOpportunityDialog } from "@/components/Opportunities/AddOpportunityDialog";
import {
  BRL, LOSS_REASONS, STAGES, SYSTEM_TYPES, formatCompact,
} from "@/lib/salesStages";

const PERIOD_OPTIONS = [
  { value: "all", label: "Todos os períodos" },
  { value: "month", label: "Este mês" },
  { value: "3months", label: "Últimos 3 meses" },
  { value: "6months", label: "Últimos 6 meses" },
  { value: "year", label: "Este ano" },
];

const getDateThreshold = (period: string): Date | null => {
  const now = new Date();
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "3months") { const d = new Date(now); d.setMonth(d.getMonth() - 3); return d; }
  if (period === "6months") { const d = new Date(now); d.setMonth(d.getMonth() - 6); return d; }
  if (period === "year") return new Date(now.getFullYear(), 0, 1);
  return null;
};

const DAY_MS = 86_400_000;
const daysSince = (iso: string) =>
  Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY_MS));

function KpiCard({
  label, value, sub, icon: Icon, iconColor, alert,
}: {
  label: string; value: string; sub?: React.ReactNode;
  icon: React.ElementType; iconColor: string; alert?: boolean;
}) {
  return (
    <Card className={cn("border", alert ? "border-amber-500/60 bg-amber-500/5" : "border-border")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider truncate">
              {label}
            </p>
            <p className="text-xl font-bold text-foreground mt-1 leading-none tabular-nums">
              {value}
            </p>
            {sub && <p className="text-xs text-muted-foreground mt-1 leading-snug">{sub}</p>}
          </div>
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColor}`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Opportunities() {
  const navigate = useNavigate();
  const { allowedClientGroupIds, allowedClientIds } = useAuthContext();
  const { opportunities, loading, addOpportunity, updateOpportunity, deleteOpportunity } =
    useOpportunities(allowedClientGroupIds);
  const { projects } = useProjects(allowedClientIds, allowedClientGroupIds);
  const { groups } = useClientGroups();

  const groupMap = useMemo(() => {
    const m: Record<string, string> = {};
    groups.forEach((g) => { m[g.id] = g.name; });
    return m;
  }, [groups]);

  /** Oportunidades que já viraram projeto — base do alerta de vazamento */
  const convertedIds = useMemo(
    () => new Set(projects.map((p) => p.opportunityId).filter(Boolean) as string[]),
    [projects],
  );

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [lostTarget, setLostTarget] = useState<Opportunity | null>(null);
  const [lostReason, setLostReason] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Opportunity | null>(null);

  // ── Filtros ──
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterResponsibles, setFilterResponsibles] = useState<string[]>([]);
  const [filterGroups, setFilterGroups] = useState<string[]>([]);
  const [filterPeriod, setFilterPeriod] = useState("all");
  const [filterValueMin, setFilterValueMin] = useState("");
  const [filterValueMax, setFilterValueMax] = useState("");
  const [showLost, setShowLost] = useState(false);

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const responsibleOptions = useMemo(
    () => Array.from(new Set(opportunities.map((o) => o.responsible).filter(Boolean))).sort(),
    [opportunities],
  );

  const groupOptions = useMemo(() => {
    const ids = new Set(opportunities.map((o) => o.clientGroupId).filter(Boolean) as string[]);
    return Array.from(ids).map((id) => ({ id, name: groupMap[id] || id })).filter((g) => g.name);
  }, [opportunities, groupMap]);

  const activeFilterCount =
    filterTypes.length + filterResponsibles.length + filterGroups.length +
    (filterPeriod !== "all" ? 1 : 0) + (filterValueMin || filterValueMax ? 1 : 0);

  const toggleArr = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  const clearFilters = () => {
    setFilterTypes([]); setFilterResponsibles([]); setFilterGroups([]);
    setFilterPeriod("all"); setFilterValueMin(""); setFilterValueMax("");
  };

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const threshold = getDateThreshold(filterPeriod);

    return opportunities.filter((opp) => {
      if (term && !opp.title.toLowerCase().includes(term) && !opp.client.toLowerCase().includes(term))
        return false;
      if (filterTypes.length > 0) {
        const ptypes = opp.type ? opp.type.split(",").map((t) => t.trim()).filter(Boolean) : [];
        if (!ptypes.some((t) => filterTypes.includes(t))) return false;
      }
      if (filterResponsibles.length > 0 && !filterResponsibles.includes(opp.responsible)) return false;
      if (filterGroups.length > 0 && (!opp.clientGroupId || !filterGroups.includes(opp.clientGroupId)))
        return false;
      if (threshold && new Date(opp.createdAtIso) < threshold) return false;
      if (filterValueMin && opp.value < parseFloat(filterValueMin)) return false;
      if (filterValueMax && opp.value > parseFloat(filterValueMax)) return false;
      return true;
    });
  }, [opportunities, searchTerm, filterTypes, filterResponsibles, filterGroups,
      filterPeriod, filterValueMin, filterValueMax]);

  // ── KPIs ──
  const metrics = useMemo(() => {
    const active = filtered.filter((o) => o.status !== "ganha" && o.status !== "perdida");
    const won = filtered.filter((o) => o.status === "ganha");
    const lost = filtered.filter((o) => o.status === "perdida");
    const awaiting = won.filter((o) => !convertedIds.has(o.id));

    const sum = (l: Opportunity[]) => l.reduce((s, o) => s + o.value, 0);
    const sumP = (l: Opportunity[]) => l.reduce((s, o) => s + (o.productValue ?? 0), 0);
    const sumS = (l: Opportunity[]) => l.reduce((s, o) => s + (o.serviceValue ?? 0), 0);

    const in30 = new Date(Date.now() + 30 * DAY_MS);
    const closing = active.filter(
      (o) => o.expectedCloseDate && new Date(o.expectedCloseDate) <= in30,
    );

    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const wonThisMonth = won.filter((o) => new Date(o.updatedAtIso) >= monthStart);

    // Taxa de ganho = ganhas / (ganhas + perdidas). Dividir pelo total incluindo
    // negócios em aberto — como fazia o Dashboard Comercial — piora a taxa a
    // cada oportunidade nova cadastrada, que é o oposto do que deveria medir.
    const decided = won.length + lost.length;
    const winRate = decided > 0 ? Math.round((won.length / decided) * 100) : null;

    const activeTotal = sum(active);
    return {
      activeValue: activeTotal,
      activeCount: active.length,
      activeProdPct: activeTotal > 0 ? Math.round((sumP(active) / activeTotal) * 100) : 0,
      closingValue: sum(closing),
      closingCount: closing.length,
      wonMonthValue: sum(wonThisMonth),
      wonMonthCount: wonThisMonth.length,
      winRate, wonCount: won.length, lostCount: lost.length,
      awaitingCount: awaiting.length,
      awaitingValue: sum(awaiting),
      awaitingOldest: awaiting.reduce((m, o) => Math.max(m, daysSince(o.updatedAtIso)), 0),
      lostValue: sum(lost),
      sumS: sumS(active),
    };
  }, [filtered, convertedIds]);

  const lostList = useMemo(() => filtered.filter((o) => o.status === "perdida"), [filtered]);

  // ── Ações ──
  const handleConvertToProject = (id: string) => {
    const opp = opportunities.find((o) => o.id === id);
    if (!opp) return;
    navigate("/projetos", {
      state: {
        fromOpportunity: {
          name: opp.title,
          client: opp.client,
          type: opp.type,
          // o split viaja para o projeto: produto e serviço são faturados em
          // fases diferentes do pipeline do Financeiro (5 e 10)
          value: String(opp.value),
          productValue: opp.productValue,
          serviceValue: opp.serviceValue,
          responsible: opp.responsible,
          opportunityId: opp.id,
          clientGroupId: opp.clientGroupId ?? null,
        },
      },
    });
  };

  const confirmLost = async () => {
    if (!lostTarget || !lostReason) return;
    await updateOpportunity({ ...lostTarget, status: "perdida", lossReason: lostReason });
    setLostTarget(null);
    setLostReason("");
  };

  const handleDrop = async (e: React.DragEvent, targetKey: string) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (!draggedId) return;
    const opp = opportunities.find((o) => o.id === draggedId);
    setDraggedId(null);
    if (!opp || opp.status === targetKey) return;
    await updateOpportunity(
      { ...opp, status: targetKey as Opportunity["status"] },
      true,
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-10 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ─── KPIs ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <KpiCard
          label="Pipeline ativo"
          value={formatCompact(metrics.activeValue)}
          sub={`${metrics.activeCount} negócio${metrics.activeCount !== 1 ? "s" : ""} · P ${metrics.activeProdPct}% / S ${100 - metrics.activeProdPct}%`}
          icon={TrendingUp}
          iconColor="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
        />
        <KpiCard
          label="Fecha em 30 dias"
          value={formatCompact(metrics.closingValue)}
          sub={metrics.closingCount > 0
            ? `${metrics.closingCount} com previsão no período`
            : "Nenhum com previsão de fechamento"}
          icon={CalendarClock}
          iconColor="bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400"
        />
        <KpiCard
          label="Ganho no mês"
          value={formatCompact(metrics.wonMonthValue)}
          sub={`${metrics.wonMonthCount} negócio${metrics.wonMonthCount !== 1 ? "s" : ""}`}
          icon={Trophy}
          iconColor="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400"
        />
        <KpiCard
          label="Taxa de ganho"
          value={metrics.winRate !== null ? `${metrics.winRate}%` : "—"}
          sub={metrics.winRate !== null
            ? `${metrics.wonCount} ganhas · ${metrics.lostCount} perdidas`
            : "Nenhum negócio decidido ainda"}
          icon={Percent}
          iconColor="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
        />
        <KpiCard
          label="Aguardando projeto"
          value={String(metrics.awaitingCount)}
          alert={metrics.awaitingCount > 0}
          sub={metrics.awaitingCount > 0
            ? `${formatCompact(metrics.awaitingValue)} parados · mais antigo há ${metrics.awaitingOldest}d`
            : "Nenhum negócio ganho sem projeto"}
          icon={AlertTriangle}
          iconColor="bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
        />
      </div>

      {/* ─── Busca + filtros ─── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar negócio ou cliente..."
            className="pl-9 h-9"
          />
        </div>

        <Select value={filterPeriod} onValueChange={setFilterPeriod}>
          <SelectTrigger className="h-9 w-44 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {PERIOD_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-9">
              <Filter className="w-3.5 h-3.5 mr-1.5" />
              Filtros
              {activeFilterCount > 0 && (
                <Badge className="ml-2 h-5 px-1.5 text-[10px]">{activeFilterCount}</Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4" align="end">
            <div className="space-y-3 max-h-[60vh] overflow-y-auto">
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Sistema</p>
                <div className="space-y-2">
                  {SYSTEM_TYPES.map((t) => (
                    <div key={t} className="flex items-center gap-2.5">
                      <Checkbox id={`t-${t}`} checked={filterTypes.includes(t)}
                        onCheckedChange={() => setFilterTypes((p) => toggleArr(p, t))} />
                      <Label htmlFor={`t-${t}`} className="text-sm font-normal cursor-pointer">{t}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {responsibleOptions.length > 0 && (
                <>
                  <Separator className="my-3" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Responsável</p>
                    <div className="space-y-2">
                      {responsibleOptions.map((r) => (
                        <div key={r} className="flex items-center gap-2.5">
                          <Checkbox id={`r-${r}`} checked={filterResponsibles.includes(r)}
                            onCheckedChange={() => setFilterResponsibles((p) => toggleArr(p, r))} />
                          <Label htmlFor={`r-${r}`} className="text-sm font-normal cursor-pointer">{r}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {groupOptions.length > 0 && (
                <>
                  <Separator className="my-3" />
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Grupo de clientes</p>
                    <div className="space-y-2">
                      {groupOptions.map((g) => (
                        <div key={g.id} className="flex items-center gap-2.5">
                          <Checkbox id={`g-${g.id}`} checked={filterGroups.includes(g.id)}
                            onCheckedChange={() => setFilterGroups((p) => toggleArr(p, g.id))} />
                          <Label htmlFor={`g-${g.id}`} className="text-sm font-normal cursor-pointer">{g.name}</Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <Separator className="my-3" />
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Valor total (R$)</p>
                <div className="flex items-center gap-2">
                  <Input type="number" placeholder="mín" value={filterValueMin}
                    onChange={(e) => setFilterValueMin(e.target.value)} className="h-8 text-sm" />
                  <Input type="number" placeholder="máx" value={filterValueMax}
                    onChange={(e) => setFilterValueMax(e.target.value)} className="h-8 text-sm" />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 text-xs text-muted-foreground">
            Limpar
          </Button>
        )}

        <Button onClick={() => { setEditingOpportunity(null); setIsAddDialogOpen(true); }} className="h-9">
          <Plus className="w-4 h-4 mr-1.5" />
          Nova Oportunidade
        </Button>
      </div>

      {/* ─── Kanban ─── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {STAGES.map((stage) => {
          const stageOpps = filtered.filter((o) => o.status === stage.key);
          const stageValue = stageOpps.reduce((s, o) => s + o.value, 0);
          const isOver = dragOverColumn === stage.key;
          const awaitingHere =
            stage.key === "ganha"
              ? stageOpps.filter((o) => !convertedIds.has(o.id)).length
              : 0;

          return (
            <div
              key={stage.key}
              onDragOver={(e) => { e.preventDefault(); setDragOverColumn(stage.key); }}
              onDragLeave={() => setDragOverColumn(null)}
              onDrop={(e) => handleDrop(e, stage.key)}
              className={cn(
                "rounded-xl border border-border bg-muted/20 p-3 transition-colors min-h-[200px]",
                isOver && "bg-primary/5 ring-2 ring-primary/30 ring-inset",
              )}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stage.color }} />
                  <h2 className="font-semibold text-sm truncate">{stage.label}</h2>
                </div>
                <Badge variant="secondary" className="shrink-0 text-xs">{stageOpps.length}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3 tabular-nums">
                {formatCompact(stageValue)}
                {awaitingHere > 0 && (
                  <span className="text-amber-500 font-medium"> · ⚠ {awaitingHere} sem projeto</span>
                )}
              </p>

              <div className="space-y-3">
                {stageOpps.map((opp) => (
                  <div
                    key={opp.id}
                    draggable
                    onDragStart={() => setDraggedId(opp.id)}
                    onDragEnd={() => setDraggedId(null)}
                    onClick={() => { setEditingOpportunity(opp); setIsAddDialogOpen(true); }}
                    className={cn(draggedId === opp.id && "opacity-40")}
                  >
                    <OpportunityCard
                      id={opp.id}
                      title={opp.title}
                      client={opp.client}
                      value={opp.value}
                      productValue={opp.productValue}
                      serviceValue={opp.serviceValue}
                      type={opp.type}
                      responsible={opp.responsible}
                      createdAtIso={opp.createdAtIso}
                      expectedCloseDate={opp.expectedCloseDate}
                      clientGroupName={opp.clientGroupId ? groupMap[opp.clientGroupId] : null}
                      status={opp.status}
                      daysInStage={daysSince(opp.updatedAtIso)}
                      awaitingProject={opp.status === "ganha" && !convertedIds.has(opp.id)}
                      onEdit={(id) => {
                        const o = opportunities.find((x) => x.id === id);
                        if (o) { setEditingOpportunity(o); setIsAddDialogOpen(true); }
                      }}
                      onDelete={(id) => {
                        const o = opportunities.find((x) => x.id === id);
                        if (o) setDeleteTarget(o);
                      }}
                      onConvertToProject={handleConvertToProject}
                      onMarkLost={(id) => {
                        const o = opportunities.find((x) => x.id === id);
                        if (o) { setLostTarget(o); setLostReason(""); }
                      }}
                    />
                  </div>
                ))}
                {stageOpps.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-8">
                    Nenhum negócio nesta etapa
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Perdidas: fora do quadro, mas visíveis ─── */}
      {lostList.length > 0 && (
        <div className="border-t border-border pt-3">
          <button
            onClick={() => setShowLost((v) => !v)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Perdidas no período: {lostList.length} · {formatCompact(metrics.lostValue)}{" "}
            {showLost ? "▲ ocultar" : "▼ ver"}
          </button>
          {showLost && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 mt-3">
              {lostList.map((opp) => (
                <div key={opp.id} className="opacity-70">
                  <OpportunityCard
                    id={opp.id}
                    title={opp.title}
                    client={opp.client}
                    value={opp.value}
                    productValue={opp.productValue}
                    serviceValue={opp.serviceValue}
                    type={opp.type}
                    responsible={opp.responsible}
                    createdAtIso={opp.createdAtIso}
                    clientGroupName={opp.clientGroupId ? groupMap[opp.clientGroupId] : null}
                    status={opp.status}
                    daysInStage={daysSince(opp.updatedAtIso)}
                    onEdit={(id) => {
                      const o = opportunities.find((x) => x.id === id);
                      if (o) { setEditingOpportunity(o); setIsAddDialogOpen(true); }
                    }}
                    onDelete={(id) => {
                      const o = opportunities.find((x) => x.id === id);
                      if (o) setDeleteTarget(o);
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <AddOpportunityDialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) setEditingOpportunity(null);
        }}
        onAdd={addOpportunity}
        onEdit={async (o) => { await updateOpportunity(o); setEditingOpportunity(null); }}
        editingOpportunity={editingOpportunity}
        existingOpportunities={opportunities}
      />

      {/* Perder um negócio exige motivo — sem isso a taxa de ganho não significa nada */}
      <AlertDialog open={!!lostTarget} onOpenChange={(v) => !v && setLostTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Marcar "{lostTarget?.title}" como perdida?</AlertDialogTitle>
            <AlertDialogDescription>
              O negócio sai do quadro e passa a contar na taxa de ganho.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label>Motivo da perda *</Label>
            <Select value={lostReason} onValueChange={setLostReason}>
              <SelectTrigger><SelectValue placeholder="Selecione o motivo" /></SelectTrigger>
              <SelectContent>
                {LOSS_REASONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLost} disabled={!lostReason}>
              Confirmar perda
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{deleteTarget?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Para encerrar um negócio sem venda,
              prefira "Marcar como perdida" — assim ele continua contando na taxa de ganho.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteTarget) await deleteOpportunity(deleteTarget.id);
                setDeleteTarget(null);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
