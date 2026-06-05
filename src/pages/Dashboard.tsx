import { Target, FolderKanban, TrendingUp, Clock, DollarSign, CheckCircle2, Repeat } from "lucide-react";
import { MetricCard } from "@/components/Dashboard/MetricCard";
import { Card } from "@/components/ui/card";
import { useProjects } from "@/hooks/useProjects";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useScheduleTasks } from "@/hooks/useScheduleTasks";
import { useReports } from "@/hooks/useReports";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";

const Dashboard = () => {
  const { projects, loading: loadingProjects } = useProjects();
  const { opportunities, loading: loadingOpportunities } = useOpportunities();
  const { tasks, loading: loadingTasks } = useScheduleTasks();
  const { reports, loading: loadingReports } = useReports();

  const isLoading = loadingProjects || loadingOpportunities || loadingTasks || loadingReports;

  // Calculate metrics from real data
  // Active opportunities are those not yet won
  const activeOpportunities = opportunities.filter(o => o.status !== 'ganha').length;

  const ongoingProjects = projects.filter(p => 
    p.status === 'in_progress' || p.status === 'Em Andamento'
  ).length;

  // Calculate total pipeline value from opportunities (excluding won)
  const parseBRL = (raw: string) => {
    const cleaned = raw.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.');
    const n = parseFloat(cleaned);
    return isNaN(n) ? 0 : n;
  };

  const pipelineValue = opportunities.reduce((total, opp) => {
    if (opp.value && opp.status !== 'ganha') return total + parseBRL(opp.value);
    return total;
  }, 0);

  // Calculate total monthly pipeline value from opportunities (excluding won)
  const pipelineMonthlyValue = opportunities.reduce((total, opp) => {
    if (opp.monthlyValue && opp.status !== 'ganha') return total + parseBRL(opp.monthlyValue);
    return total;
  }, 0);

  // Calculate conversion rate (won / total)
  const wonOpportunities = opportunities.filter(o => o.status === 'ganha').length;
  const totalOpportunities = opportunities.length;
  const conversionRate = totalOpportunities > 0 
    ? Math.round((wonOpportunities / totalOpportunities) * 100) 
    : 0;

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(0)}K`;
    }
    return `R$ ${value.toFixed(0)}`;
  };

  const metrics = [
    {
      title: "Oportunidades Ativas",
      value: activeOpportunities,
      icon: Target,
    },
    {
      title: "Projetos em Andamento",
      value: ongoingProjects,
      icon: FolderKanban,
      gradient: true,
    },
    {
      title: "Valor em Pipeline (vendas)",
      value: formatCurrency(pipelineValue),
      icon: TrendingUp,
    },
    {
      title: "Valor em Pipeline (mensal)",
      value: formatCurrency(pipelineMonthlyValue),
      icon: Repeat,
    },
    {
      title: "Taxa de Conversão",
      value: `${conversionRate}%`,
      icon: CheckCircle2,
    },
  ];

  // Get recent projects (last 3)
  const recentProjects = projects.slice(0, 3).map(project => {
    // Calculate progress based on tasks
    const projectTasks = tasks.filter(t => t.projectId === project.id);
    const avgProgress = projectTasks.length > 0
      ? Math.round(projectTasks.reduce((sum, t) => sum + t.progress, 0) / projectTasks.length)
      : 0;
    
    return {
      name: `${project.name}${project.type ? ` - ${project.type}` : ''}`,
      status: project.status === 'in_progress' ? 'Em Andamento' : 
              project.status === 'completed' ? 'Concluído' : 
              project.status === 'planning' ? 'Planejamento' : project.status,
      progress: avgProgress,
      value: project.value || 'N/A',
    };
  });

  // Get recent activities from all sources
  const getRecentActivities = () => {
    const activities: Array<{
      action: string;
      item: string;
      time: string;
      icon: typeof Target;
      date: Date;
    }> = [];

    // Add opportunities
    opportunities.slice(0, 2).forEach(opp => {
      activities.push({
        action: "Oportunidade criada",
        item: `${opp.title} - ${opp.client}`,
        time: formatRelativeTime(new Date(opp.createdAt || Date.now())),
        icon: Target,
        date: new Date(opp.createdAt || Date.now()),
      });
    });

    // Add projects
    projects.slice(0, 2).forEach(proj => {
      activities.push({
        action: proj.status === 'completed' ? "Projeto concluído" : "Projeto atualizado",
        item: proj.name,
        time: formatRelativeTime(new Date(proj.startDate || Date.now())),
        icon: proj.status === 'completed' ? CheckCircle2 : FolderKanban,
        date: new Date(proj.startDate || Date.now()),
      });
    });

    // Add reports
    reports.slice(0, 2).forEach(report => {
      activities.push({
        action: "Relatório criado",
        item: report.title,
        time: formatRelativeTime(new Date(report.createdAt || Date.now())),
        icon: DollarSign,
        date: new Date(report.createdAt || Date.now()),
      });
    });

    // Sort by date and return top 4
    return activities
      .sort((a, b) => b.date.getTime() - a.date.getTime())
      .slice(0, 4);
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return "Agora";
    if (diffHours < 24) return `Há ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
    if (diffDays === 1) return "Há 1 dia";
    if (diffDays < 7) return `Há ${diffDays} dias`;
    if (diffDays < 30) return `Há ${Math.floor(diffDays / 7)} semana${Math.floor(diffDays / 7) > 1 ? 's' : ''}`;
    return `Há ${Math.floor(diffDays / 30)} mês${Math.floor(diffDays / 30) > 1 ? 'es' : ''}`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral dos seus projetos e oportunidades</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-muted-foreground">Visão geral dos seus projetos e oportunidades</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {metrics.map((metric, index) => (
          <MetricCard key={index} {...metric} />
        ))}
      </div>

      {/* Recent Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Projetos Recentes</h2>
            <Link to="/projetos" className="text-sm text-primary hover:underline">Ver todos</Link>
          </div>
          
          {recentProjects.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum projeto cadastrado</p>
          ) : (
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
          )}
        </Card>

        {/* Quick Actions */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-6">Ações Rápidas</h2>
          
          <div className="space-y-3">
            <Link 
              to="/oportunidades"
              className="w-full flex items-center gap-3 p-4 rounded-lg bg-gradient-primary text-primary-foreground hover:shadow-glow transition-all duration-300"
            >
              <Target className="w-5 h-5" />
              <div className="text-left">
                <p className="font-semibold">Nova Oportunidade</p>
                <p className="text-xs opacity-90">Registrar novo lead</p>
              </div>
            </Link>
            
            <Link 
              to="/projetos"
              className="w-full flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <FolderKanban className="w-5 h-5 text-primary" />
              <div className="text-left">
                <p className="font-semibold">Novo Projeto</p>
                <p className="text-xs text-muted-foreground">Criar projeto</p>
              </div>
            </Link>
            
            <Link 
              to="/relatorios"
              className="w-full flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-muted transition-colors"
            >
              <DollarSign className="w-5 h-5 text-accent" />
              <div className="text-left">
                <p className="font-semibold">Gerar Relatório</p>
                <p className="text-xs text-muted-foreground">Criar novo relatório</p>
              </div>
            </Link>
          </div>
        </Card>
      </div>

      {/* Activity Timeline */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-6">Atividades Recentes</h2>
        
        {getRecentActivities().length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Nenhuma atividade recente</p>
        ) : (
          <div className="space-y-4">
            {getRecentActivities().map((activity, index) => (
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
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
