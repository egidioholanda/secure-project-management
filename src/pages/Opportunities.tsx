import { useState } from "react";
import { Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OpportunityCard } from "@/components/Opportunities/OpportunityCard";
import { Input } from "@/components/ui/input";
import { AddOpportunityDialog } from "@/components/Opportunities/AddOpportunityDialog";

interface Opportunity {
  id: string;
  title: string;
  client: string;
  value: string;
  type: string;
  responsible: string;
  createdAt: string;
  status: "prospeccao" | "qualificacao" | "proposta" | "negociacao" | "ganha";
}

const initialOpportunities: Opportunity[] = [
  {
    id: "1",
    title: "Banco Central - Sistema CFTV",
    client: "Banco do Brasil",
    value: "R$ 450.000",
    type: "CFTV",
    responsible: "João Silva",
    createdAt: "2 dias atrás",
    status: "qualificacao",
  },
  {
    id: "2",
    title: "Condomínio Vila Rica - Controle Acesso",
    client: "Condomínio Vila Rica",
    value: "R$ 85.000",
    type: "Controle de Acesso",
    responsible: "Maria Santos",
    createdAt: "5 dias atrás",
    status: "proposta",
  },
  {
    id: "3",
    title: "Indústria Metalúrgica - Alarme Perimetral",
    client: "Metalúrgica Forte",
    value: "R$ 320.000",
    type: "Alarme Perimetral",
    responsible: "Carlos Mendes",
    createdAt: "1 semana atrás",
    status: "negociacao",
  },
  {
    id: "4",
    title: "Hospital São Lucas - Sistema Integrado",
    client: "Hospital São Lucas",
    value: "R$ 680.000",
    type: "Sistema Integrado",
    responsible: "Ana Paula",
    createdAt: "3 dias atrás",
    status: "prospeccao",
  },
];

const Opportunities = () => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [opportunities, setOpportunities] = useState<Opportunity[]>(initialOpportunities);
  const [editingOpportunity, setEditingOpportunity] = useState<Opportunity | null>(null);

  const handleAddOpportunity = (newOpp: Omit<Opportunity, "id" | "createdAt">) => {
    const opportunity: Opportunity = {
      ...newOpp,
      id: Date.now().toString(),
      createdAt: "Agora",
    };
    setOpportunities((prev) => [...prev, opportunity]);
  };

  const handleEditOpportunity = (updated: Opportunity) => {
    setOpportunities((prev) =>
      prev.map((opp) => (opp.id === updated.id ? updated : opp))
    );
    setEditingOpportunity(null);
  };

  const handleDeleteOpportunity = (id: string) => {
    setOpportunities((prev) => prev.filter((opp) => opp.id !== id));
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
