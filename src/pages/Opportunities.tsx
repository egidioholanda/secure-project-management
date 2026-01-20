import { useState } from "react";
import { Plus, Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OpportunityCard } from "@/components/Opportunities/OpportunityCard";
import { Input } from "@/components/ui/input";
import { AddOpportunityDialog } from "@/components/Opportunities/AddOpportunityDialog";
import { useOpportunities, Opportunity } from "@/hooks/useOpportunities";

const Opportunities = () => {
  const {
    opportunities,
    loading,
    addOpportunity,
    updateOpportunity,
    deleteOpportunity,
  } = useOpportunities();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);

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
      setEditingOpportunity(opp);
      setIsAddDialogOpen(true);
    }
  };

  const statuses = [
    { key: "prospeccao", label: "Prospecção" },
    { key: "qualificacao", label: "Qualificação" },
    { key: "proposta", label: "Proposta Enviada" },
    { key: "negociacao", label: "Negociação" },
    { key: "ganha", label: "Ganha" },
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Oportunidades</h1>
          <p className="text-muted-foreground">Gerencie seu pipeline de vendas</p>
        </div>
        <Button 
          className="bg-gradient-primary hover:shadow-glow transition-all duration-300"
          onClick={() => setIsAddDialogOpen(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Oportunidade
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="flex-1 max-w-md">
          <Input placeholder="Buscar oportunidades..." />
        </div>
        <Button variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          Filtros
        </Button>
      </div>

      {/* Status Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {statuses.map((status) => {
          const statusOpps = opportunities.filter((opp) => opp.status === status.key);
          return (
            <div key={status.key} className="space-y-3">
              <div className="flex items-center justify-between px-3 py-2 bg-muted rounded-lg">
                <h3 className="font-semibold text-sm">{status.label}</h3>
                <span className="text-xs bg-background px-2 py-1 rounded-md font-medium">
                  {statusOpps.length}
                </span>
              </div>
              
              <div className="space-y-3">
                {statusOpps.map((opp) => (
                  <OpportunityCard 
                    key={opp.id} 
                    {...opp} 
                    onEdit={openEditDialog}
                    onDelete={handleDeleteOpportunity}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <AddOpportunityDialog
        open={isAddDialogOpen}
        onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) setEditingOpportunity(null);
        }}
        onAdd={handleAddOpportunity}
        onEdit={handleEditOpportunity}
        editingOpportunity={editingOpportunity}
      />
    </div>
  );
};

export default Opportunities;
