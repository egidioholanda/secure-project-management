import { useState, useMemo } from "react";
import { Plus, Filter, Loader2, X, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { OpportunityCard } from "@/components/Opportunities/OpportunityCard";
import { Input } from "@/components/ui/input";
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
import { AddOpportunityDialog } from "@/components/Opportunities/AddOpportunityDialog";
import { useOpportunities, Opportunity } from "@/hooks/useOpportunities";
import { useClientGroups } from "@/hooks/useClientGroups";
import { useAuthContext } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const ALL_TYPES = ["CFTV", "Controle de Acesso", "Alarme Perimetral", "Sistema Integrado", "Automação"];

const PERIOD_OPTIONS = [
  { value: "all",     label: "Todos os períodos" },
  { value: "today",   label: "Hoje" },
  { value: "week",    label: "Esta semana" },
  { value: "month",   label: "Este mês" },
  { value: "3months", label: "Últimos 3 meses" },
  { value: "6months", label: "Últimos 6 meses" },
  { value: "year",    label: "Este ano" },
];

function getDateThreshold(period: string): Date | null {
  const now = new Date();
  if (period === "today")   return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "week")    { const d = new Date(now); d.setDate(d.getDate() - 7); return d; }
  if (period === "month")   return new Date(now.getFullYear(), now.getMonth(), 1);
  if (period === "3months") { const d = new Date(now); d.setMonth(d.getMonth() - 3); return d; }
  if (period === "6months") { const d = new Date(now); d.setMonth(d.getMonth() - 6); return d; }
  if (period === "year")    return new Date(now.getFullYear(), 0, 1);
  return null;
}

function parseBRLVal(raw: string) {
  if (!raw) return 0;
  const n = parseFloat(raw.replace(/[^\d.,]/g, "").replace(/\./g, "").replace(",", "."));
  return isNaN(n) ? 0 : n;
}

const Opportunities = () => {
  const navigate = useNavigate();
  const { allowedClientGroupIds } = useAuthContext();
  const {
    opportunities,
    loading,
    addOpportunity,
    updateOpportunity,
    deleteOpportunity,
  } = useOpportunities(allowedClientGroupIds);

  const { groups } = useClientGroups();
  const groupMap = useMemo(() => {
    const m: Record<string, string> = {};
    groups.forEach((g) => { m[g.id] = g.name; });
    return m;
  }, [groups]);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [duplicatingOpportunity, setDuplicatingOpportunity] = useState<Opportunity | null>(null);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [searchTerm, setSearchTerm]             = useState("");
  const [filterTypes, setFilterTypes]           = useState<string[]>([]);
  const [filterResponsibles, setFilterResponsibles] = useState<string[]>([]);
  const [filterGroups, setFilterGroups]         = useState<string[]>([]);
  const [filterPeriod, setFilterPeriod]         = useState("all");
  const [filterDateFrom, setFilterDateFrom]     = useState("");
  const [filterDateTo, setFilterDateTo]         = useState("");
  const [filterValueMin, setFilterValueMin]     = useState("");
  const [filterValueMax, setFilterValueMax]     = useState("");

  // Drag and drop state
  const [draggedId, setDraggedId]             = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn]   = useState<string | null>(null);

  // Dynamic lists from data
  const responsibleOptions = useMemo(() => {
    const set = new Set(opportunities.map((o) => o.responsible).filter(Boolean));
    return Array.from(set).sort();
  }, [opportunities]);

  const groupOptions = useMemo(() => {
    const ids = new Set(opportunities.map((o) => o.clientGroupId).filter(Boolean) as string[]);
    return Array.from(ids).map((id) => ({ id, name: groupMap[id] || id })).filter((g) => g.name);
  }, [opportunities, groupMap]);

  const hasDateFilter = filterDateFrom || filterDateTo;

  const activeFilterCount =
    filterTypes.length +
    filterResponsibles.length +
    filterGroups.length +
    (filterPeriod !== "all" ? 1 : 0) +
    (hasDateFilter ? 1 : 0) +
    (filterValueMin || filterValueMax ? 1 : 0);

  const toggleArr = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  const clearFilters = () => {
    setFilterTypes([]);
    setFilterResponsibles([]);
    setFilterGroups([]);
    setFilterPeriod("all");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterValueMin("");
    setFilterValueMax("");
  };

  // Filtered opportunities
  const filteredOpportunities = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const threshold = filterPeriod !== "all" ? getDateThreshold(filterPeriod) : null;

    return opportunities.filter((opp) => {
      // Search
      if (term && !opp.title.toLowerCase().includes(term) && !opp.client.toLowerCase().includes(term))
        return false;

      // Type (handles comma-separated multi-type)
      if (filterTypes.length > 0) {
        const ptypes = opp.type ? opp.type.split(",").map((t) => t.trim()).filter(Boolean) : [];
        if (!ptypes.some((t) => filterTypes.includes(t))) return false;
      }

      // Responsible
      if (filterResponsibles.length > 0 && !filterResponsibles.includes(opp.responsible))
        return false;

      // Group
      if (filterGroups.length > 0) {
        if (!opp.clientGroupId || !filterGroups.includes(opp.clientGroupId)) return false;
      }

      // Period (quick preset)
      if (threshold && new Date(opp.createdAtIso) < threshold) return false;

      // Custom date range
      if (filterDateFrom && new Date(opp.createdAtIso) < new Date(filterDateFrom)) return false;
      if (filterDateTo && new Date(opp.createdAtIso) > new Date(filterDateTo + "T23:59:59")) return false;

      // Value range
      if (filterValueMin || filterValueMax) {
        const v = parseBRLVal(opp.value);
        if (filterValueMin && v < parseBRLVal(filterValueMin)) return false;
        if (filterValueMax && v > parseBRLVal(filterValueMax)) return false;
      }

      return true;
    });
  }, [opportunities, searchTerm, filterTypes, filterResponsibles, filterGroups,
      filterPeriod, filterDateFrom, filterDateTo, filterValueMin, filterValueMax]);

  const handleAddOpportunity = async (newOpp: Omit<Opportunity, "id" | "createdAt">) => {
    await addOpportunity(newOpp);
  };

  const handleEditOpportunity = async (updated: Opportunity) => {
    await updateOpportunity(updated);
    setEditingOpportunity(null);
  };

  const handleDeleteOpportunity = async (id: string) => {
    await deleteOpportunity(id);
  };

  const openEditDialog = (id: string) => {
    const opp = opportunities.find((o) => o.id === id);
    if (opp) {
      setDuplicatingOpportunity(null);
      setEditingOpportunity(opp);
      setIsAddDialogOpen(true);
    }
  };

  const openDuplicateDialog = (id: string) => {
    const opp = opportunities.find((o) => o.id === id);
    if (opp) {
      setEditingOpportunity(null);
      setDuplicatingOpportunity(opp);
      setIsAddDialogOpen(true);
    }
  };

  const handleConvertToProject = (id: string) => {
    const opp = opportunities.find((o) => o.id === id);
    if (opp) {
      const projectData = {
        name: opp.title,
        client: opp.client,
        type: opp.type,
        value: opp.value,
        responsible: opp.responsible,
        opportunityId: opp.id,
        clientGroupId: opp.clientGroupId ?? null,
      };
      navigate("/projetos", { state: { fromOpportunity: projectData } });
    }
  };

  // ── DnD handlers ──────────────────────────────────────────────────────────

  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.effectAllowed = "move";
    setDraggedId(id);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, columnKey: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== columnKey) setDragOverColumn(columnKey);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetColumn: { key: string; matchKeys: string[] }) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (!draggedId) return;
    const opp = opportunities.find((o) => o.id === draggedId);
    setDraggedId(null);
    if (!opp || targetColumn.matchKeys.includes(opp.status)) return;
    await updateOpportunity({ ...opp, status: targetColumn.key as Opportunity["status"] });
  };

  // ─────────────────────────────────────────────────────────────────────────

  const statuses: Array<{ key: string; label: string; matchKeys: string[] }> = [
    { key: "prospeccao",     label: "Oportunidade",           matchKeys: ["prospeccao", "qualificacao"] },
    { key: "proposta",       label: "Proposta Enviada",        matchKeys: ["proposta"] },
    { key: "pedido_cliente", label: "Pedido Cliente Enviado",  matchKeys: ["pedido_cliente"] },
    { key: "negociacao",     label: "Pedido Comercial Criado", matchKeys: ["negociacao", "pedido_produto", "pedido_servico"] },
    { key: "ganha",          label: "Pedido Faturado",         matchKeys: ["ganha", "faturado_produto", "faturado_servico"] },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const periodLabel = PERIOD_OPTIONS.find((p) => p.value === filterPeriod)?.label;

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-end">
        <Button
          className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Oportunidade
        </Button>
      </div>

      {/* Search + Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-md">
          <Input
            placeholder="Buscar por título ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="relative gap-2">
              <Filter className="w-4 h-4" />
              Filtros
              {activeFilterCount > 0 && (
                <Badge className="ml-1 h-5 px-1.5 text-xs">{activeFilterCount}</Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4 max-h-[80vh] overflow-y-auto" align="end">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold">Filtros</p>
              {activeFilterCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs text-muted-foreground gap-1"
                  onClick={clearFilters}
                >
                  <X className="w-3 h-3" />
                  Limpar
                </Button>
              )}
            </div>

            {/* ── Período ── */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Período
              </p>
              <Select value={filterPeriod} onValueChange={(v) => { setFilterPeriod(v); if (v !== "all") { setFilterDateFrom(""); setFilterDateTo(""); } }}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERIOD_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator className="my-3" />

            {/* ── Intervalo de datas ── */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5" />
                Intervalo de datas
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">De</Label>
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    value={filterDateFrom}
                    onChange={(e) => { setFilterDateFrom(e.target.value); setFilterPeriod("all"); }}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Até</Label>
                  <Input
                    type="date"
                    className="h-8 text-xs"
                    value={filterDateTo}
                    onChange={(e) => { setFilterDateTo(e.target.value); setFilterPeriod("all"); }}
                  />
                </div>
              </div>
            </div>

            <Separator className="my-3" />

            {/* ── Intervalo de valor ── */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Valor total (R$)
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Mínimo</Label>
                  <Input
                    type="number"
                    placeholder="0"
                    className="h-8 text-xs"
                    value={filterValueMin}
                    onChange={(e) => setFilterValueMin(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Máximo</Label>
                  <Input
                    type="number"
                    placeholder="∞"
                    className="h-8 text-xs"
                    value={filterValueMax}
                    onChange={(e) => setFilterValueMax(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Separator className="my-3" />

            {/* ── Tipo ── */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Tipo de Projeto
              </p>
              {ALL_TYPES.map((type) => (
                <div key={type} className="flex items-center gap-2">
                  <Checkbox
                    id={`type-${type}`}
                    checked={filterTypes.includes(type)}
                    onCheckedChange={() => setFilterTypes((p) => toggleArr(p, type))}
                  />
                  <Label htmlFor={`type-${type}`} className="text-sm font-normal cursor-pointer">
                    {type}
                  </Label>
                </div>
              ))}
            </div>

            {/* ── Grupo ── */}
            {groupOptions.length > 0 && (
              <>
                <Separator className="my-3" />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Grupo de Clientes
                  </p>
                  {groupOptions.map((g) => (
                    <div key={g.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`group-${g.id}`}
                        checked={filterGroups.includes(g.id)}
                        onCheckedChange={() => setFilterGroups((p) => toggleArr(p, g.id))}
                      />
                      <Label htmlFor={`group-${g.id}`} className="text-sm font-normal cursor-pointer">
                        {g.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ── Responsável ── */}
            {responsibleOptions.length > 0 && (
              <>
                <Separator className="my-3" />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Responsável
                  </p>
                  {responsibleOptions.map((r) => (
                    <div key={r} className="flex items-center gap-2">
                      <Checkbox
                        id={`resp-${r}`}
                        checked={filterResponsibles.includes(r)}
                        onCheckedChange={() => setFilterResponsibles((p) => toggleArr(p, r))}
                      />
                      <Label htmlFor={`resp-${r}`} className="text-sm font-normal cursor-pointer">
                        {r}
                      </Label>
                    </div>
                  ))}
                </div>
              </>
            )}
          </PopoverContent>
        </Popover>

        {/* Active filter chips */}
        {filterPeriod !== "all" && (
          <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => setFilterPeriod("all")}>
            {periodLabel} <X className="w-3 h-3" />
          </Badge>
        )}
        {hasDateFilter && (
          <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => { setFilterDateFrom(""); setFilterDateTo(""); }}>
            <CalendarDays className="w-3 h-3" />
            {filterDateFrom && filterDateTo ? `${filterDateFrom} → ${filterDateTo}` : filterDateFrom || filterDateTo}
            <X className="w-3 h-3" />
          </Badge>
        )}
        {filterTypes.map((t) => (
          <Badge key={t} variant="secondary" className="gap-1 cursor-pointer" onClick={() => setFilterTypes((p) => p.filter((x) => x !== t))}>
            {t} <X className="w-3 h-3" />
          </Badge>
        ))}
        {filterGroups.map((id) => (
          <Badge key={id} variant="secondary" className="gap-1 cursor-pointer" onClick={() => setFilterGroups((p) => p.filter((x) => x !== id))}>
            {groupMap[id] || id} <X className="w-3 h-3" />
          </Badge>
        ))}
        {filterResponsibles.map((r) => (
          <Badge key={r} variant="secondary" className="gap-1 cursor-pointer" onClick={() => setFilterResponsibles((p) => p.filter((x) => x !== r))}>
            {r.split(" ")[0]} <X className="w-3 h-3" />
          </Badge>
        ))}
        {(filterValueMin || filterValueMax) && (
          <Badge variant="secondary" className="gap-1 cursor-pointer" onClick={() => { setFilterValueMin(""); setFilterValueMax(""); }}>
            R$ {filterValueMin || "0"} – {filterValueMax || "∞"} <X className="w-3 h-3" />
          </Badge>
        )}
      </div>

      {/* Kanban columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statuses.map((status) => {
          const statusOpps = filteredOpportunities.filter((opp) => status.matchKeys.includes(opp.status));
          const isOver = dragOverColumn === status.key;

          return (
            <div
              key={status.key}
              className={cn(
                "space-y-3 rounded-xl p-2 -m-2 transition-colors duration-150",
                isOver && "bg-primary/5 ring-2 ring-primary/30 ring-inset"
              )}
              onDragOver={(e) => handleDragOver(e, status.key)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, status)}
            >
              <div className="flex items-center justify-between px-3 py-2 bg-muted rounded-lg sticky top-16 z-10 shadow-sm">
                <h3 className="font-semibold text-sm">{status.label}</h3>
                <span className="text-xs bg-background px-2 py-1 rounded-md font-medium">
                  {statusOpps.length}
                </span>
              </div>

              <div className={cn("space-y-3 min-h-[60px]", isOver && "pb-3")}>
                {statusOpps.map((opp) => (
                  <div
                    key={opp.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, opp.id)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "cursor-grab active:cursor-grabbing transition-opacity duration-150",
                      draggedId === opp.id && "opacity-40"
                    )}
                  >
                    <OpportunityCard
                      {...opp}
                      clientGroupName={opp.clientGroupId ? groupMap[opp.clientGroupId] || null : null}
                      onEdit={openEditDialog}
                      onDuplicate={openDuplicateDialog}
                      onDelete={handleDeleteOpportunity}
                      onConvertToProject={handleConvertToProject}
                    />
                  </div>
                ))}

                {isOver && draggedId && !statusOpps.find((o) => o.id === draggedId) && (
                  <div className="h-16 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5" />
                )}
              </div>
            </div>
          );
        })}
      </div>

      <AddOpportunityDialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) {
            setEditingOpportunity(null);
            setDuplicatingOpportunity(null);
          }
        }}
        onAdd={handleAddOpportunity}
        onEdit={handleEditOpportunity}
        editingOpportunity={editingOpportunity}
        duplicatingOpportunity={duplicatingOpportunity}
      />
    </div>
  );
};

export default Opportunities;
