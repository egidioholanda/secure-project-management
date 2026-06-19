import { useState } from "react";
import { Plus, Filter, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OpportunityCard } from "@/components/Opportunities/OpportunityCard";
import { Input } from "@/components/ui/input";
import { AddOpportunityDialog } from "@/components/Opportunities/AddOpportunityDialog";
import { useOpportunities, Opportunity } from "@/hooks/useOpportunities";
import { useNavigate } from "react-router-dom";

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

  const handleConvertToProject = (id: string) => {
    const opp = opportunities.find((o) => o.id === id);
    if (opp) {
      // Navigate to projects page with opportunity data
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

  const statuses: Array<{ key: string; label: string; matchKeys: string[] }> = [
    { key: "prospeccao", label: "Oportunidade", matchKeys: ["prospeccao", "qualificacao"] },
    { key: "proposta", label: "Proposta Enviada", matchKeys: ["proposta"] },
    { key: "negociacao", label: "Pedido feito", matchKeys: ["negociacao"] },
    { key: "ganha", label: "Pedido Faturado", matchKeys: ["ganha"] },
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4">
        {statuses.map((status) => {
          const statusOpps = opportunities.filter((opp) => status.matchKeys.includes(opp.status));
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
                    onConvertToProject={handleConvertToProject}
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
