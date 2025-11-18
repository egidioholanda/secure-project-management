import { Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OpportunityCard } from "@/components/Opportunities/OpportunityCard";
import { Input } from "@/components/ui/input";

const Opportunities = () => {
  const opportunities = [
    {
      id: "1",
      title: "Banco Central - Sistema CFTV",
      client: "Banco do Brasil",
      value: "R$ 450.000",
      type: "CFTV",
      responsible: "João Silva",
      createdAt: "2 dias atrás",
      status: "qualificacao" as const,
    },
    {
      id: "2",
      title: "Condomínio Vila Rica - Controle Acesso",
      client: "Condomínio Vila Rica",
      value: "R$ 85.000",
      type: "Controle de Acesso",
      responsible: "Maria Santos",
      createdAt: "5 dias atrás",
      status: "proposta" as const,
    },
    {
      id: "3",
      title: "Indústria Metalúrgica - Alarme Perimetral",
      client: "Metalúrgica Forte",
      value: "R$ 320.000",
      type: "Alarme Perimetral",
      responsible: "Carlos Mendes",
      createdAt: "1 semana atrás",
      status: "negociacao" as const,
    },
    {
      id: "4",
      title: "Hospital São Lucas - Sistema Integrado",
      client: "Hospital São Lucas",
      value: "R$ 680.000",
      type: "Sistema Integrado",
      responsible: "Ana Paula",
      createdAt: "3 dias atrás",
      status: "prospeccao" as const,
    },
  ];

  const statuses = [
    { key: "prospeccao", label: "Prospecção", count: 8 },
    { key: "qualificacao", label: "Qualificação", count: 5 },
    { key: "proposta", label: "Proposta Enviada", count: 6 },
    { key: "negociacao", label: "Negociação", count: 4 },
    { key: "ganha", label: "Ganha", count: 12 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Oportunidades</h1>
          <p className="text-muted-foreground">Gerencie seu pipeline de vendas</p>
        </div>
        <Button className="bg-gradient-primary hover:shadow-glow transition-all duration-300">
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
        {statuses.map((status) => (
          <div key={status.key} className="space-y-3">
            <div className="flex items-center justify-between px-3 py-2 bg-muted rounded-lg">
              <h3 className="font-semibold text-sm">{status.label}</h3>
              <span className="text-xs bg-background px-2 py-1 rounded-md font-medium">
                {status.count}
              </span>
            </div>
            
            <div className="space-y-3">
              {opportunities
                .filter((opp) => opp.status === status.key)
                .map((opp) => (
                  <OpportunityCard key={opp.id} {...opp} />
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Opportunities;
