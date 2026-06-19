import { useState, useMemo } from "react";
import { Plus, Filter, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { OpportunityCard } from "@/components/Opportunities/OpportunityCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { AddOpportunityDialog } from "@/components/Opportunities/AddOpportunityDialog";
import { useOpportunities, Opportunity } from "@/hooks/useOpportunities";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const ALL_TYPES = ["CFTV", "Controle de Acesso", "Alarme Perimetral", "Sistema Integrado", "Automação"];

const Opportunities = () => {
  const navigate = useNavigate();
  const {
    opportunities,
    loading,
    addOpportunity,
    updateOpportunity,
    deleteOpportunity,
  } = useOpportunities();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);
  const [duplicatingOpportunity, setDuplicatingOpportunity] = useState<Opportunity | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTypes, setFilterTypes] = useState<string[]>([]);
  const [filterResponsibles, setFilterResponsibles] = useState<string[]>([]);

  // Drag and drop state
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  // Dynamic responsible list from data
  const responsibleOptions = useMemo(() => {
    const set = new Set(opportunities.map((o) => o.responsible).filter(Boolean));
    return Array.from(set).sort();
  }, [opportunities]);

  const activeFilterCount = filterTypes.length + filterResponsibles.length;

  const toggleType = (type: string) =>
    setFilterTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );

  const toggleResponsible = (r: string) =>
    setFilterResponsibles((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );

  const clearFilters = () => {
    setFilterTypes([]);
    setFilterResponsibles([]);
  };

  // Filtered opportunities
  const filteredOpportunities = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return opportunities.filter((opp) => {
      if (term && !opp.title.toLowerCase().includes(term) && !opp.client.toLowerCase().includes(term))
        return false;
      if (filterTypes.length > 0 && !filterTypes.includes(opp.type)) return false;
      if (filterResponsibles.length > 0 && !filterResponsibles.includes(opp.responsible)) return false;
      return true;
    });
  }, [opportunities, searchTerm, filterTypes, filterResponsibles]);

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
          <PopoverContent className="w-72 p-4" align="end">
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

            {/* Tipo */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Tipo de Projeto
              </p>
              {ALL_TYPES.map((type) => (
                <div key={type} className="flex items-center gap-2">
                  <Checkbox
                    id={`type-${type}`}
                    checked={filterTypes.includes(type)}
                    onCheckedChange={() => toggleType(type)}
                  />
                  <Label htmlFor={`type-${type}`} className="text-sm font-normal cursor-pointer">
                    {type}
                  </Label>
                </div>
              ))}
            </div>

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
                        onCheckedChange={() => toggleResponsible(r)}
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
        {filterTypes.map((t) => (
          <Badge key={t} variant="secondary" className="gap-1 cursor-pointer" onClick={() => toggleType(t)}>
            {t}
            <X className="w-3 h-3" />
          </Badge>
        ))}
        {filterResponsibles.map((r) => (
          <Badge key={r} variant="secondary" className="gap-1 cursor-pointer" onClick={() => toggleResponsible(r)}>
            {r.split(" ")[0]}
            <X className="w-3 h-3" />
          </Badge>
        ))}
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
