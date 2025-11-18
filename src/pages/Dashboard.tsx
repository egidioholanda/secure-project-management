import { Target, FolderKanban, TrendingUp, Clock, DollarSign, CheckCircle2 } from "lucide-react";
import { MetricCard } from "@/components/Dashboard/MetricCard";
import { Card } from "@/components/ui/card";

const Dashboard = () => {
  const metrics = [
    {
      title: "Oportunidades Ativas",
      value: 24,
      change: "+12%",
      changeType: "positive" as const,
      icon: Target,
    },
    {
      title: "Projetos em Andamento",
      value: 8,
      change: "+2",
      changeType: "positive" as const,
      icon: FolderKanban,
      gradient: true,
    },
    {
      title: "Valor em Pipeline",
      value: "R$ 2.4M",
      change: "+18%",
      changeType: "positive" as const,
      icon: TrendingUp,
    },
    {
      title: "Taxa de Conversão",
      value: "68%",
      change: "+5%",
      changeType: "positive" as const,
      icon: CheckCircle2,
    },
  ];

  const recentProjects = [
    { name: "Shopping Center Norte - CFTV", status: "Em Andamento", progress: 75, value: "R$ 180.000" },
    { name: "Condomínio Residencial - Controle Acesso", status: "Em Andamento", progress: 45, value: "R$ 95.000" },
    { name: "Fábrica Industrial - Alarme Perimetral", status: "Planejamento", progress: 20, value: "R$ 220.000" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral dos seus projetos e oportunidades</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {/* Recent Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Projetos Recentes</h2>
            <a href="/projetos" className="text-sm text-primary hover:underline">Ver todos</a>
          </div>
          
          <div className="space-y-4">
            {recentProjects.map((project, index) => (
              <div key={index} className="border-b border-border last:border-0 pb-4 last:pb-0">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-medium text-sm mb-1">{project.name}</h3>
                    <p className="text-xs text-muted-foreground">{project.status}</p>
                  </div>
                  <span className="text-sm font-semibold text-success">{project.value}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                  <div 
                    className="h-full bg-gradient-primary transition-all duration-500"
                    style={{ width: `${project.progress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{project.progress}% concluído</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Quick Actions */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">Ações Rápidas</h2>
          
          <div className="space-y-3">
            <button className="w-full flex items-center gap-3 p-4 rounded-lg bg-gradient-primary text-primary-foreground hover:shadow-glow transition-all duration-300">
              <Target className="w-5 h-5" />
              <div className="text-left">
                <p className="font-semibold">Nova Oportunidade</p>
                <p className="text-xs opacity-90">Registrar novo lead</p>
              </div>
            </button>
            
            <button className="w-full flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted transition-colors">
              <FolderKanban className="w-5 h-5 text-primary" />
              <div className="text-left">
                <p className="font-semibold">Novo Projeto</p>
                <p className="text-xs text-muted-foreground">Criar projeto</p>
              </div>
            </button>
            
            <button className="w-full flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted transition-colors">
              <DollarSign className="w-5 h-5 text-accent" />
              <div className="text-left">
                <p className="font-semibold">Gerar Proposta</p>
                <p className="text-xs text-muted-foreground">Criar nova proposta</p>
              </div>
            </button>
          </div>
        </Card>
      </div>

      {/* Activity Timeline */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">Atividades Recentes</h2>
        
        <div className="space-y-4">
          {[
            { action: "Oportunidade criada", item: "Banco Central - Sistema CFTV", time: "Há 2 horas", icon: Target },
            { action: "Projeto atualizado", item: "Shopping Center Norte - CFTV", time: "Há 5 horas", icon: FolderKanban },
            { action: "Proposta enviada", item: "Condomínio Vila Rica - Controle Acesso", time: "Há 1 dia", icon: DollarSign },
            { action: "Projeto concluído", item: "Escritório Advocacia - Alarme", time: "Há 2 dias", icon: CheckCircle2 },
          ].map((activity, index) => (
            <div key={index} className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <activity.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-sm">{activity.action}</p>
                <p className="text-sm text-muted-foreground">{activity.item}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                {activity.time}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

export default Dashboard;
