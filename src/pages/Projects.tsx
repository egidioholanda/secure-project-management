import { Plus, Filter, Grid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Projects = () => {
  const projects = [
    {
      id: "1",
      name: "Shopping Center Norte - CFTV",
      client: "Shopping Center Norte",
      type: "CFTV",
      status: "execution",
      progress: 75,
      startDate: "01/03/2024",
      endDate: "30/06/2024",
      manager: "João Silva",
      value: "R$ 180.000",
    },
    {
      id: "2",
      name: "Condomínio Residencial - Controle Acesso",
      client: "Condomínio Portal das Águas",
      type: "Controle de Acesso",
      status: "execution",
      progress: 45,
      startDate: "15/03/2024",
      endDate: "15/07/2024",
      manager: "Maria Santos",
      value: "R$ 95.000",
    },
    {
      id: "3",
      name: "Fábrica Industrial - Alarme Perimetral",
      client: "Indústria Forte LTDA",
      type: "Alarme Perimetral",
      status: "planning",
      progress: 20,
      startDate: "20/04/2024",
      endDate: "20/08/2024",
      manager: "Carlos Mendes",
      value: "R$ 220.000",
    },
    {
      id: "4",
      name: "Hospital São Lucas - Sistema Integrado",
      client: "Hospital São Lucas",
      type: "Sistema Integrado",
      status: "completed",
      progress: 100,
      startDate: "01/01/2024",
      endDate: "31/03/2024",
      manager: "Ana Paula",
      value: "R$ 450.000",
    },
  ];

  const statusConfig = {
    planning: { label: "Planejamento", color: "bg-primary/10 text-primary" },
    execution: { label: "Em Execução", color: "bg-accent/10 text-accent" },
    completed: { label: "Concluído", color: "bg-success/10 text-success" },
    onhold: { label: "Em Espera", color: "bg-warning/10 text-warning" },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Projetos</h1>
          <p className="text-muted-foreground">Gerencie todos os seus projetos</p>
        </div>
        <Button className="bg-gradient-primary hover:shadow-glow transition-all duration-300">
          <Plus className="w-4 h-4 mr-2" />
          Novo Projeto
        </Button>
      </div>

      {/* Filters & View */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon">
            <Grid className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon">
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map((project) => {
          const statusInfo = statusConfig[project.status as keyof typeof statusConfig];
          
          return (
            <Card key={project.id} className="p-6 hover:shadow-elegant transition-all duration-300 cursor-pointer group">
              <div className="flex items-start justify-between mb-4">
                <Badge className={statusInfo.color}>{statusInfo.label}</Badge>
                <span className="text-sm font-semibold text-success">{project.value}</span>
              </div>

              <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                {project.name}
              </h3>
              <p className="text-sm text-muted-foreground mb-4">{project.client}</p>

              <div className="space-y-3 mb-4">
                <div>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className="font-semibold">{project.progress}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-primary transition-all duration-500"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Gerente:</span>
                  <span className="font-medium">{project.manager}</span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Prazo:</span>
                  <span className="font-medium">{project.startDate} - {project.endDate}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <Badge variant="secondary">{project.type}</Badge>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Projects;
